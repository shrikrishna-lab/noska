/**
 * xAI Grok Dynamic Model Discovery Adapter
 * 
 * Queries xAI Models API: https://api.x.ai/v1/models
 */

import type { DiscoveredModel, ModelDiscoveryAdapter, ProviderDiscoveryConfig } from '../types';

export class XAIModelDiscovery implements ModelDiscoveryAdapter {
  readonly provider = "xai" as const;

  async listModels(config?: ProviderDiscoveryConfig): Promise<DiscoveredModel[]> {
    if (!config?.apiKey) {
      throw new Error("xAI API key required for live model discovery");
    }

    const baseUrl = config.baseUrl || "https://api.x.ai/v1";
    const res = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: config.signal,
    });

    if (!res.ok) {
      throw new Error(`xAI API error (${res.status}): ${await res.text().catch(() => "")}`);
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

    // Filter to grok chat models
    if (!lowerId.includes("grok") || lowerId.includes("embed")) {
      return null;
    }

    const isVision = lowerId.includes("vision");
    const isReasoning = lowerId.includes("reason") || lowerId.includes("r1");

    return {
      apiModelId: id,
      displayName: id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      family: "grok",
      contextWindow: 131072,
      maxOutputTokens: 8192,
      createdAt: raw.created ? raw.created * 1000 : undefined,
      capabilities: {
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
      status: "available",
      raw,
    };
  }
}
