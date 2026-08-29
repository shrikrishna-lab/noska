/**
 * OpenAI Dynamic Model Discovery Adapter
 * 
 * Queries OpenAI API: https://api.openai.com/v1/models
 * Filters for chat, reasoning, and multimodal models.
 */

import type { DiscoveredModel, ModelDiscoveryAdapter, ProviderDiscoveryConfig } from '../types';
import { KNOWN_MODEL_OVERRIDES } from '../ModelMetadataOverrides';

export class OpenAIModelDiscovery implements ModelDiscoveryAdapter {
  readonly provider = "openai" as const;

  async listModels(config?: ProviderDiscoveryConfig): Promise<DiscoveredModel[]> {
    if (!config?.apiKey) {
      throw new Error("OpenAI API key required for live model discovery");
    }

    const baseUrl = config.baseUrl || "https://api.openai.com/v1";
    const res = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: config.signal,
    });

    if (!res.ok) {
      throw new Error(`OpenAI API error (${res.status}): ${await res.text().catch(() => "")}`);
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

    const lowerId = id.toLowerCase();

    // Filter out non-chat / non-conversational models
    if (
      lowerId.includes("embedding") ||
      lowerId.includes("moderation") ||
      lowerId.includes("whisper") ||
      lowerId.includes("tts") ||
      lowerId.includes("dall-e") ||
      lowerId.includes("babbage") ||
      lowerId.includes("davinci") ||
      lowerId.includes("curie") ||
      lowerId.includes("ada") ||
      lowerId.includes("realtime") ||
      lowerId.includes("audio") ||
      lowerId.includes("canary") ||
      lowerId.includes("search-") ||
      lowerId.startsWith("ft:")
    ) {
      return null;
    }

    // Check known overrides for explicit shutdowns
    const override = KNOWN_MODEL_OVERRIDES[id];
    if (override?.status === "shutdown" || override?.status === "deprecated") return null;

    // Detect reasoning and multimodal capabilities dynamically
    const isReasoning = lowerId.startsWith("o1") || lowerId.startsWith("o3") || lowerId.startsWith("o-") || lowerId.includes("reasoning");
    const isVision = lowerId.includes("4o") || lowerId.includes("vision") || lowerId.includes("turbo") || lowerId.includes("omni") || !lowerId.includes("mini");

    return {
      apiModelId: id,
      displayName: override?.displayName || id,
      family: override?.family || (isReasoning ? "o-series" : "gpt-4"),
      contextWindow: override?.contextWindow || 128000,
      maxOutputTokens: override?.maxOutputTokens || (isReasoning ? 100000 : 16384),
      createdAt: raw.created ? raw.created * 1000 : undefined,
      capabilities: override?.capabilities || {
        streaming: true,
        reasoning: isReasoning,
        tools: true,
        vision: isVision,
        audio: false,
        video: false,
        imageGeneration: false,
        structuredOutput: true,
        mcp: true,
        agentMode: true,
      },
      reasoningModes: isReasoning ? ["low", "medium", "high"] : undefined,
      status: lowerId.includes("preview") ? "preview" : "available",
      raw,
    };
  }
}
