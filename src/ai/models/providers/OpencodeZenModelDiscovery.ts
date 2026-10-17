/**
 * OpenCode Zen Dynamic Model Discovery Adapter
 * 
 * Authoritative Model Catalog: GET https://opencode.ai/zen/v1/models
 * Official Protocols & Endpoints:
 * - OpenAI-compatible chat: https://opencode.ai/zen/v1/chat/completions
 * - Anthropic-compatible messages: https://opencode.ai/zen/v1/messages
 * - Responses protocol: https://opencode.ai/zen/v1/responses
 * 
 * Exposes ALL currently available Zen models without the generic top-8 limit.
 */

import type { DiscoveredModel, ModelDiscoveryAdapter, ProviderDiscoveryConfig, ModelWireProtocol } from '../types';
import { fetchJsonViaProxy, stripModelPrefixForRequest } from './proxyDiscovery';
import {
  ZEN_CLIENT_ONLY_CONDITION,
  isZenApiAccessible,
  looksFreeTier,
} from './zenAvailability';

const OFFICIAL_BASE = "https://opencode.ai/zen/v1";

export class OpencodeZenModelDiscovery implements ModelDiscoveryAdapter {
  readonly provider = "opencode_zen" as const;

  async listModels(config?: ProviderDiscoveryConfig): Promise<DiscoveredModel[]> {
    const baseUrl = (config?.baseUrl || OFFICIAL_BASE).replace(/\/+$/, "");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };
    if (config?.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey.trim()}`;
    }

    // GET /models is CORS-sensitive. Go direct first, fall back to the ai-proxy
    // relay. The relay URL comes from core/providerProxy — the old same-origin
    // "/api/proxy/opencode" path only exists in the Vite dev server, so in
    // production it returned the SPA index.html (200 + HTML), `res.json()`
    // threw, and with an API key set this rethrew instead of using the
    // snapshot. An empty registry then made every send carry a composite model
    // id that resolveZenProtocol could not classify.
    const result = await fetchJsonViaProxy(`${baseUrl}/models`, headers, config?.signal);

    if (result.ok === true) {
      const json = result.json;
      const rawList: unknown[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      const models: DiscoveredModel[] = [];
      for (const raw of rawList) {
        const normalized = this.normalizeModel(raw, baseUrl);
        if (normalized) models.push(normalized);
      }
      if (models.length > 0) return models;
    } else if (config?.apiKey && baseUrl !== OFFICIAL_BASE) {
      // Only a hard error for an explicitly configured custom endpoint (a typo
      // there is worth reporting). For the official endpoint any failure must
      // degrade to the verified snapshot.
      throw new Error(`OpenCode Zen endpoint returned ${result.error}`);
    }

    return this.getOfficialSnapshotModels(baseUrl);
  }

  normalizeModel(raw: any, customBaseUrl?: string): DiscoveredModel | null {
    if (!raw || typeof raw !== "object") return null;
    const id = stripModelPrefixForRequest(String(raw.id || raw.name || ""));
    if (!id) return null;

    const lowerId = id.toLowerCase();
    if (lowerId.includes("embed") || lowerId.includes("moderation")) {
      return null;
    }

    const baseUrl = (customBaseUrl || OFFICIAL_BASE).replace(/\/+$/, "");

    // Protocol & Endpoint Mapping (mirrors docs/zen endpoint table):
    //   claude-*, qwen*       → /messages   (Anthropic protocol)
    //   gpt-*, grok-*, muse-* → /responses  (OpenAI Responses protocol)
    //   gemini-* and the rest → /chat/completions
    let protocol: ModelWireProtocol = "openai_chat";
    let endpoint = `${baseUrl}/chat/completions`;

    if (lowerId.startsWith("claude-") || lowerId.startsWith("qwen")) {
      protocol = "anthropic_messages";
      endpoint = `${baseUrl}/messages`;
    } else if (lowerId.startsWith("gpt-") || lowerId.startsWith("grok-") || lowerId.startsWith("muse-")) {
      protocol = "responses";
      endpoint = `${baseUrl}/responses`;
    } else if (lowerId.startsWith("gemini-")) {
      protocol = "gemini";
      endpoint = `${baseUrl}/chat/completions`;
    }

    // Dynamic Free-Tier Detection
    const promptCost = typeof raw.pricing?.prompt === "string" ? parseFloat(raw.pricing.prompt) : (typeof raw.pricing?.prompt === "number" ? raw.pricing.prompt : undefined);
    const completionCost = typeof raw.pricing?.completion === "string" ? parseFloat(raw.pricing.completion) : (typeof raw.pricing?.completion === "number" ? raw.pricing.completion : undefined);
    // Free-tier detection. Zen's GET /models payload carries no pricing and no
    // `free` flag, so this is name-based. It uses the shared looksFreeTier
    // predicate rather than a local `-free` suffix check: `big-pickle` is
    // priced "Free" in Zen's docs but does not end in "-free", so a local
    // suffix test classified it as a normal paid model while
    // isZenApiAccessible() correctly treated it as gated. The picker then
    // offered it unfiltered and the user got a 403 on a model that looked
    // billable.
    const hasZeroPrice = promptCost === 0 && completionCost === 0;
    const isFreeTag = looksFreeTier(lowerId) || raw.free === true || raw.is_free === true;
    const requiresSub = Boolean(raw.requires_subscription || raw.requires_sub || false);

    const isFree = (hasZeroPrice || isFreeTag) && !requiresSub;

    // Free price does not mean callable from here. Zen serves its free models
    // only to the OpenCode client and answers 403 FreeTierError to any other
    // API caller — see zenAvailability.ts for the verified evidence. Mark those
    // "free_limited" with the reason attached so the picker can hide them
    // instead of offering a model that cannot work.
    const apiAccessible = isZenApiAccessible(id);
    const clientOnly = !apiAccessible;

    const pricing = raw.pricing
      ? {
        inputPer1M: promptCost !== undefined ? promptCost * 1000000 : undefined,
        outputPer1M: completionCost !== undefined ? completionCost * 1000000 : undefined,
        currency: "USD",
      }
      : undefined;

    const freeAccess = isFree
      ? {
        isFree: true,
        status: clientOnly ? ("free_limited" as const) : ("free" as const),
        source: "zen_catalog" as const,
        verifiedAt: new Date().toISOString(),
        conditions: clientOnly
          ? [ZEN_CLIENT_ONLY_CONDITION]
          : isFreeTag ? ["OpenCode Zen Free Tier"] : undefined,
      }
      : {
        isFree: false,
        status: "paid" as const,
        source: "zen_catalog" as const,
        verifiedAt: new Date().toISOString(),
      };

    // Capabilities Detection
    const isReasoning = Boolean(
      raw.capabilities?.reasoning ||
      raw.reasoning ||
      lowerId.includes("reason") ||
      lowerId.includes("r1") ||
      lowerId.includes("thinking") ||
      lowerId.includes("codex") ||
      lowerId.includes("opus") ||
      lowerId.includes("pro")
    );

    const isVision = Boolean(
      raw.capabilities?.vision ||
      lowerId.includes("vision") ||
      lowerId.includes("vl") ||
      lowerId.includes("flash") ||
      lowerId.includes("sonnet") ||
      lowerId.includes("opus") ||
      lowerId.includes("gemini")
    );

    // Family classification
    let family = "opencode-zen";
    if (lowerId.startsWith("gpt-") || lowerId.includes("codex")) family = "gpt";
    else if (lowerId.startsWith("claude-")) family = "claude";
    else if (lowerId.startsWith("gemini-")) family = "gemini";
    else if (lowerId.startsWith("grok-")) family = "grok";
    else if (lowerId.startsWith("deepseek-")) family = "deepseek";
    else if (lowerId.startsWith("qwen")) family = "qwen";
    else if (lowerId.startsWith("minimax-")) family = "minimax";
    else if (lowerId.startsWith("glm-")) family = "glm";
    else if (lowerId.startsWith("kimi-")) family = "kimi";
    else if (lowerId.startsWith("nemotron-")) family = "nemotron";
    else if (lowerId.startsWith("muse-")) family = "muse";

    // Format clean display name
    let cleanName = id
      .replace(/-free$/i, " (Free)")
      .replace(/\b(gpt|claude|gemini|grok|deepseek|qwen|minimax|glm|kimi|muse|nemotron|mimo|hy3|ling|laguna|pickle)\b/gi, match => match.toUpperCase())
      .replace(/[-_]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      apiModelId: id,
      displayName: raw.displayName || raw.name || cleanName,
      family,
      version: raw.version,
      contextWindow: typeof raw.context_length === "number" ? raw.context_length : (typeof raw.context_window === "number" ? raw.context_window : 128000),
      maxOutputTokens: typeof raw.max_output_tokens === "number" ? raw.max_output_tokens : 8192,
      protocol,
      endpoint,
      pricing,
      freeAccess,
      createdAt: raw.created ? raw.created * 1000 : undefined,
      capabilities: {
        streaming: true,
        reasoning: isReasoning,
        tools: true,
        vision: isVision,
        audio: lowerId.includes("audio") || lowerId.includes("omni"),
        video: lowerId.includes("video"),
        imageGeneration: false,
        structuredOutput: true,
        mcp: true,
        agentMode: true,
      },
      reasoningModes: isReasoning ? ["low", "medium", "high"] : undefined,
      // "preview" keeps the model in the catalog for reference while marking
      // it as not something we can serve today; the picker filters on this
      // via ModelRegistry.getLatestModelsForProvider.
      status: clientOnly && looksFreeTier(lowerId) ? "preview" : "available",
      raw,
    };
  }

private getOfficialSnapshotModels(baseUrl: string): DiscoveredModel[] {
    // Mirrors GET https://opencode.ai/zen/v1/models, verified 2026-10-10.
    // This is only a fallback for when /models is unreachable; keep it current
    // or the offline path offers models that no longer exist (the previous
    // snapshot listed deepseek-v4-flash-free -> 400, mimo-v2.5-free -> 410
    // ModelDeprecated).
    const rawIds = [
      // Free tier. NOTE: every id here except "space-bunny-free" answers 403
      // FreeTierError ("OpenCode's free tier can only be used from within
      // OpenCode") when called from a third-party client such as Noska, even
      // with a valid key. They are kept so the catalog still reflects reality,
      // but they must not be advertised as usable without an API key.
      "big-pickle",
      "ling-3.1-flash-free", "mimo-v2.6-flash-free", "muse-spark-1.2-contributor-free",
      "muse-spark-1.3-contributor-free", "nemotron-3.5-lightning-free", "jev-1.13-free",
      "step-5-preview-free", "longcat-2.5-preview-free", "space-bunny-free",
      // Anthropic Messages protocol
      "claude-fable-5", "claude-fable-5-1", "claude-haiku-4-5", "claude-haiku-5-5",
      "claude-opus-4-5", "claude-opus-4-6", "claude-opus-4-7", "claude-opus-4-8",
      "claude-opus-5", "claude-opus-5-5", "claude-sonnet-4-5", "claude-sonnet-4-6",
      "claude-sonnet-5", "claude-sonnet-5-5", "qwen3.5-plus", "qwen3.6-plus",
      "qwen3.8-flash", "qwen3.8-max",
      // OpenAI Responses protocol
      "gpt-5", "gpt-5-codex", "gpt-5-nano", "gpt-5.1", "gpt-5.1-codex",
      "gpt-5.1-codex-max", "gpt-5.1-codex-mini", "gpt-5.2", "gpt-5.2-codex",
      "gpt-5.3-codex", "gpt-5.3-codex-spark", "gpt-5.4", "gpt-5.4-mini",
      "gpt-5.4-nano", "gpt-5.4-pro", "gpt-5.5", "gpt-5.5-pro", "gpt-5.6-luna",
      "gpt-5.6-sol", "gpt-5.6-terra", "gpt-6-astra", "gpt-6-sol", "gpt-6.1-sol",
      "gpt-6-luna", "grok-4.5", "grok-4.6", "grok-4.7", "grok-build-0.1",
      "muse-spark-1.2", "muse-spark-1.3",
      // OpenAI chat-completions protocol
      "deepseek-v4-flash", "deepseek-v4.1-flash", "deepseek-v4-pro",
      "gemini-3-flash", "gemini-3.1-pro", "gemini-3.5-flash",
      "gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.7-flash",
      "gemini-3.8-flash",
      "glm-5", "glm-5.1", "glm-5.2", "glm-5.3", "glm-5.3-flash",
      "kimi-k2.5", "kimi-k2.6", "kimi-k2.7-code", "kimi-k3",
      "minimax-m2.5", "minimax-m2.7", "minimax-m3", "mistral-large-4",
      "jev-1.13",
    ];

    return rawIds.map(id => this.normalizeModel({ id, object: "model", owned_by: "opencode" }, baseUrl)!).filter(Boolean);
  }
}


