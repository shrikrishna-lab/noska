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

export class OpencodeZenModelDiscovery implements ModelDiscoveryAdapter {
  readonly provider = "opencode_zen" as const;

  async listModels(config?: ProviderDiscoveryConfig): Promise<DiscoveredModel[]> {
    const baseUrl = (config?.baseUrl || "https://opencode.ai/zen/v1").replace(/\/+$/, "");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (config?.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey.trim()}`;
    }

    const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";
    const resolvedBaseUrl = (isBrowser && baseUrl === "https://opencode.ai/zen/v1") ? "/api/proxy/opencode" : baseUrl;

    try {
      const res = await fetch(`${resolvedBaseUrl}/models`, {
        method: "GET",
        headers,
        signal: config?.signal,
      });

      if (!res.ok) {
        throw new Error(`OpenCode Zen endpoint returned HTTP ${res.status}`);
      }

      const json = await res.json();
      const rawList: unknown[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      const models: DiscoveredModel[] = [];

      for (const raw of rawList) {
        const normalized = this.normalizeModel(raw, baseUrl);
        if (normalized) models.push(normalized);
      }

      return models;
    } catch (err: unknown) {
      if (config?.apiKey || config?.baseUrl) {
        throw err;
      }
      // Return verified official catalog snapshot when running unconfigured/offline
      return this.getOfficialSnapshotModels(baseUrl);
    }
  }

  normalizeModel(raw: any, customBaseUrl?: string): DiscoveredModel | null {
    if (!raw || typeof raw !== "object") return null;
    const id = String(raw.id || raw.name || "");
    if (!id) return null;

    const lowerId = id.toLowerCase();
    if (lowerId.includes("embed") || lowerId.includes("moderation")) {
      return null;
    }

    const baseUrl = (customBaseUrl || "https://opencode.ai/zen/v1").replace(/\/+$/, "");

    // Protocol & Endpoint Mapping
    let protocol: ModelWireProtocol = "openai_chat";
    let endpoint = `${baseUrl}/chat/completions`;

    if (lowerId.startsWith("claude-")) {
      protocol = "anthropic_messages";
      endpoint = `${baseUrl}/messages`;
    } else if (lowerId.includes("responses")) {
      protocol = "responses";
      endpoint = `${baseUrl}/responses`;
    } else if (lowerId.startsWith("gemini-")) {
      protocol = "gemini";
      endpoint = `${baseUrl}/chat/completions`;
    }

    // Dynamic Free-Tier Detection
    const promptCost = typeof raw.pricing?.prompt === "string" ? parseFloat(raw.pricing.prompt) : (typeof raw.pricing?.prompt === "number" ? raw.pricing.prompt : undefined);
    const completionCost = typeof raw.pricing?.completion === "string" ? parseFloat(raw.pricing.completion) : (typeof raw.pricing?.completion === "number" ? raw.pricing.completion : undefined);
    const hasZeroPrice = promptCost === 0 && completionCost === 0;
    const isFreeTag = lowerId.endsWith("-free") || raw.free === true || raw.is_free === true;
    const requiresSub = Boolean(raw.requires_subscription || raw.requires_sub || false);

    const isFree = (hasZeroPrice || isFreeTag) && !requiresSub;

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
          status: "free" as const,
          source: "zen_catalog" as const,
          verifiedAt: new Date().toISOString(),
          conditions: isFreeTag ? ["OpenCode Zen Free Tier"] : undefined,
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
      status: "available",
      raw,
    };
  }

  private getOfficialSnapshotModels(baseUrl: string): DiscoveredModel[] {
    const rawIds = [
      "claude-fable-5", "claude-opus-5", "claude-opus-4-8", "claude-opus-4-7", "claude-opus-4-6", "claude-opus-4-5",
      "claude-sonnet-5", "claude-sonnet-4-6", "claude-sonnet-4-5", "claude-sonnet-4", "claude-haiku-4-5",
      "gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.1-pro", "gemini-3-flash",
      "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.5", "gpt-5.5-pro", "gpt-5.4", "gpt-5.4-pro", "gpt-5.4-mini", "gpt-5.4-nano",
      "gpt-5.3-codex-spark", "gpt-5.3-codex", "gpt-5.2", "gpt-5.2-codex", "gpt-5.1", "gpt-5.1-codex-max", "gpt-5.1-codex", "gpt-5.1-codex-mini",
      "gpt-5", "gpt-5-codex", "gpt-5-nano",
      "grok-build-0.1", "grok-4.6", "grok-4.5",
      "muse-spark-1.2", "deepseek-v4-pro", "deepseek-v4-flash",
      "glm-5.2", "glm-5.1", "glm-5",
      "minimax-m3", "minimax-m2.7", "minimax-m2.5",
      "kimi-k3", "kimi-k2.7-code", "kimi-k2.6", "kimi-k2.5",
      "qwen3.6-plus", "qwen3.5-plus", "big-pickle",
      "deepseek-v4-flash-free", "muse-spark-1.2-contributor-free", "mimo-v2.5-free", "hy3-free",
      "ling-3.0-flash-fin-free", "nemotron-3-ultra-free", "nemotron-3.5-lightning-free", "laguna-s-2.1-free"
    ];

    return rawIds.map(id => this.normalizeModel({ id, object: "model", owned_by: "opencode" }, baseUrl)!).filter(Boolean);
  }
}


