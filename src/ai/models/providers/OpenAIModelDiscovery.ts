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
      return this.getOfficialSnapshotModels();
    }

    const baseUrl = config.baseUrl || "https://api.openai.com/v1";
    try {
      const res = await fetch(`${baseUrl}/models`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${config.apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        signal: config.signal,
      });

      if (!res.ok) {
        return this.getOfficialSnapshotModels();
      }

      const json = await res.json();
      const rawList: unknown[] = Array.isArray(json?.data) ? json.data : [];

      const models: DiscoveredModel[] = [];
      for (const raw of rawList) {
        const normalized = this.normalizeModel(raw);
        if (normalized) models.push(normalized);
      }

      if (models.length === 0) {
        return this.getOfficialSnapshotModels();
      }

      return models;
    } catch {
      return this.getOfficialSnapshotModels();
    }
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

  getOfficialSnapshotModels(): DiscoveredModel[] {
    const rawIds = [
      "gpt-5.6-sol",
      "gpt-5.6-terra",
      "gpt-5.6-luna",
      "gpt-5.5",
      "gpt-5.4",
      "gpt-5.3-codex",
      "gpt-5",
      "o3",
      "o3-mini",
      "o1",
      "o1-mini",
      "gpt-4o",
      "gpt-4o-mini",
      "chatgpt-4o-latest"
    ];

    return rawIds.map(id => this.normalizeModel({ id, object: "model" })!).filter(Boolean);
  }
}
