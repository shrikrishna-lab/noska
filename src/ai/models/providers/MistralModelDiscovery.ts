/**
 * Mistral AI Dynamic Model Discovery Adapter
 * 
 * Queries Mistral AI Models API: https://api.mistral.ai/v1/models
 */

import type { DiscoveredModel, ModelDiscoveryAdapter, ProviderDiscoveryConfig } from '../types';

export class MistralModelDiscovery implements ModelDiscoveryAdapter {
  readonly provider = "mistral" as const;

  async listModels(config?: ProviderDiscoveryConfig): Promise<DiscoveredModel[]> {
    if (!config?.apiKey) {
      throw new Error("Mistral API key required for live model discovery");
    }

    const baseUrl = config.baseUrl || "https://api.mistral.ai/v1";
    const res = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: config.signal,
    });

    if (!res.ok) {
      throw new Error(`Mistral API error (${res.status}): ${await res.text().catch(() => "")}`);
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

    // Exclude embedding and non-chat models
    if (lowerId.includes("embed") || lowerId.includes("moderation")) {
      return null;
    }

    // Check completion_chat capability if present
    if (raw.capabilities && typeof raw.capabilities === "object" && raw.capabilities.completion_chat === false) {
      return null;
    }

    const context = typeof raw.max_context_length === "number" ? raw.max_context_length : 128000;
    const isVision = lowerId.includes("pixtral");

    return {
      apiModelId: id,
      displayName: raw.name ? String(raw.name) : id,
      family: "mistral",
      contextWindow: context,
      maxOutputTokens: 8192,
      createdAt: raw.created ? raw.created * 1000 : undefined,
      description: raw.description ? String(raw.description).slice(0, 200) : undefined,
      capabilities: {
        streaming: true,
        reasoning: false,
        tools: true,
        vision: isVision,
        audio: false,
        video: false,
        imageGeneration: false,
        structuredOutput: true,
        mcp: true,
        agentMode: true,
      },
      status: "available",
      raw,
    };
  }
}
