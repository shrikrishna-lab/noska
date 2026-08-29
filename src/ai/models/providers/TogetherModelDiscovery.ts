/**
 * Together AI Dynamic Model Discovery Adapter
 * 
 * Queries Together AI Models API: https://api.together.xyz/v1/models
 */

import type { DiscoveredModel, ModelDiscoveryAdapter, ProviderDiscoveryConfig } from '../types';

export class TogetherModelDiscovery implements ModelDiscoveryAdapter {
  readonly provider = "together" as const;

  async listModels(config?: ProviderDiscoveryConfig): Promise<DiscoveredModel[]> {
    if (!config?.apiKey) {
      throw new Error("Together API key required for live model discovery");
    }

    const baseUrl = config.baseUrl || "https://api.together.xyz/v1";
    const res = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: config.signal,
    });

    if (!res.ok) {
      throw new Error(`Together API error (${res.status}): ${await res.text().catch(() => "")}`);
    }

    const json = await res.json();
    const rawList: unknown[] = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);

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

    // Filter to chat / language models
    if (raw.type && raw.type !== "chat" && raw.type !== "language") {
      return null;
    }

    const lowerId = id.toLowerCase();

    // Exclude embedding, audio, image-gen, rerank
    if (
      lowerId.includes("embed") ||
      lowerId.includes("whisper") ||
      lowerId.includes("diffusion") ||
      lowerId.includes("flux") ||
      lowerId.includes("rerank")
    ) {
      return null;
    }

    const context = typeof raw.context_length === "number" ? raw.context_length : 131072;
    const isReasoning = lowerId.includes("r1") || lowerId.includes("reason") || lowerId.includes("thinking");

    return {
      apiModelId: id,
      displayName: raw.display_name ? String(raw.display_name) : id,
      family: "together",
      contextWindow: context,
      maxOutputTokens: 8192,
      createdAt: raw.created_at ? new Date(raw.created_at).getTime() : undefined,
      description: raw.description ? String(raw.description).slice(0, 200) : undefined,
      capabilities: {
        streaming: true,
        reasoning: isReasoning,
        tools: !isReasoning,
        vision: lowerId.includes("vision") || lowerId.includes("vl"),
        audio: false,
        video: false,
        imageGeneration: false,
        structuredOutput: true,
        mcp: true,
        agentMode: true,
      },
      reasoningModes: isReasoning ? ["high"] : undefined,
      status: "available",
      raw,
    };
  }
}
