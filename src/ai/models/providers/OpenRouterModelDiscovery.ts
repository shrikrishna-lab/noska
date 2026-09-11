/**
 * OpenRouter Dynamic Model Discovery Adapter
 * 
 * Queries OpenRouter's live API: https://openrouter.ai/api/v1/models
 * Filters for chat/instruct models and extracts context windows, pricing, and architecture.
 */

import type { DiscoveredModel, ModelDiscoveryAdapter, ProviderDiscoveryConfig } from '../types';

export class OpenRouterModelDiscovery implements ModelDiscoveryAdapter {
  readonly provider = "openrouter" as const;

  async listModels(config?: ProviderDiscoveryConfig): Promise<DiscoveredModel[]> {
    const url = "https://openrouter.ai/api/v1/models";
    const headers: Record<string, string> = {
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://noska.me",
      "X-Title": "Noska AI",
    };
    if (config?.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
    }

    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: config?.signal,
    });

    if (!res.ok) {
      throw new Error(`OpenRouter API error (${res.status}): ${await res.text().catch(() => "")}`);
    }

    const json = await res.json();
    const rawList: unknown[] = Array.isArray(json?.data) ? json.data : [];

    const models: DiscoveredModel[] = [];
    for (const raw of rawList) {
      const normalized = this.normalizeModel(raw);
      if (normalized) models.push(normalized);
    }

    return models;
  }

  normalizeModel(raw: any): DiscoveredModel | null {
    if (!raw || typeof raw !== "object") return null;
    const id = String(raw.id || "");
    if (!id) return null;

    // Filter out non-chat / embedding / moderation / speech models
    const lowerId = id.toLowerCase();
    if (
      lowerId.includes("embed") ||
      lowerId.includes("moderation") ||
      lowerId.includes("whisper") ||
      lowerId.includes("tts") ||
      lowerId.includes("rerank") ||
      lowerId.includes("babbage") ||
      lowerId.includes("davinci") ||
      lowerId.includes("guard")
    ) {
      return null;
    }

    const name = raw.name ? String(raw.name) : id;
    const context = typeof raw.context_length === "number" ? raw.context_length : 128000;
    const maxOutput = typeof raw.top_provider?.max_completion_tokens === "number"
      ? raw.top_provider.max_completion_tokens
      : undefined;

    const promptCost = typeof raw.pricing?.prompt === "string" ? parseFloat(raw.pricing.prompt) : (typeof raw.pricing?.prompt === "number" ? raw.pricing.prompt : undefined);
    const completionCost = typeof raw.pricing?.completion === "string" ? parseFloat(raw.pricing.completion) : (typeof raw.pricing?.completion === "number" ? raw.pricing.completion : undefined);
    const requiresSub = Boolean(raw.requires_subscription || raw.requires_sub || false);

    const pricing = raw.pricing
      ? {
        inputPer1M: promptCost !== undefined ? promptCost * 1000000 : undefined,
        outputPer1M: completionCost !== undefined ? completionCost * 1000000 : undefined,
        currency: "USD",
      }
      : undefined;

    const isFree = (promptCost === 0 && completionCost === 0 && !requiresSub) || id.endsWith(":free") || lowerId.includes(":free");
    const freeAccess = isFree
      ? {
        isFree: true,
        status: "free" as const,
        source: "catalog" as const,
        verifiedAt: new Date().toISOString(),
        conditions: ["OpenRouter Free Tier"],
      }
      : {
        isFree: false,
        status: "paid" as const,
        source: "catalog" as const,
        verifiedAt: new Date().toISOString(),
      };

    // Check OpenRouter metadata fields
    const modality = String(raw.architecture?.modality || "");
    const supportedParams: string[] = Array.isArray(raw.supported_parameters) ? raw.supported_parameters : [];

    const isReasoning =
      raw.architecture?.instruct_type === "thinking" ||
      supportedParams.includes("reasoning") ||
      supportedParams.includes("thinking") ||
      lowerId.includes("reason") ||
      lowerId.includes("thinking") ||
      lowerId.includes("r1") ||
      lowerId.includes("o1") ||
      lowerId.includes("o3");

    const isVision =
      modality.includes("image->text") ||
      modality.includes("image") ||
      modality.includes("multimodal") ||
      lowerId.includes("vision") ||
      lowerId.includes("vl") ||
      lowerId.includes("4o") ||
      lowerId.includes("gemini") ||
      lowerId.includes("claude-3");

    const supportsTools =
      supportedParams.length > 0
        ? supportedParams.includes("tools") || supportedParams.includes("function_calling")
        : (!isReasoning || lowerId.includes("o3") || lowerId.includes("sonnet"));

    return {
      apiModelId: id,
      displayName: name,
      contextWindow: context,
      maxOutputTokens: maxOutput,
      pricing,
      freeAccess,
      createdAt: raw.created ? raw.created * 1000 : undefined,
      description: raw.description ? String(raw.description).slice(0, 200) : undefined,
      capabilities: {
        streaming: true,
        reasoning: isReasoning,
        tools: supportsTools,
        vision: isVision,
        audio: modality.includes("audio"),
        video: modality.includes("video"),
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

  getOfficialSnapshotModels(): DiscoveredModel[] {
    const rawIds = [
      { id: "z-ai/glm-5.2:free", name: "GLM 5.2 (Free)", pricing: { prompt: "0", completion: "0" } },
      { id: "minimax/minimax-m3:free", name: "MiniMax M3 (Free)", pricing: { prompt: "0", completion: "0" } },
      { id: "nvidia/nemotron-3.5-lightning:free", name: "Nemotron 3.5 Lightning (Free)", pricing: { prompt: "0", completion: "0" } },
      { id: "google/gemma-4-26b-a4b-it:free", name: "Gemma 4 26B (Free)", pricing: { prompt: "0", completion: "0" } },
      { id: "poolside/laguna-s-2.1:free", name: "Laguna S 2.1 (Free)", pricing: { prompt: "0", completion: "0" } },
      { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B Instruct (Free)", pricing: { prompt: "0", completion: "0" } },
      { id: "anthropic/claude-3.7-sonnet", name: "Claude 3.7 Sonnet", architecture: { modality: "image->text" } },
      { id: "openai/gpt-4o", name: "GPT-4o (Omni)", architecture: { modality: "image->text" } },
      { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", architecture: { modality: "image->text" } }
    ];

    return rawIds.map(raw => this.normalizeModel({ ...raw, context_length: 128000 })!).filter(Boolean);
  }
}
