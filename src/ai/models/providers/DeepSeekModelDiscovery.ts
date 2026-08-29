/**
 * DeepSeek Dynamic Model Discovery Adapter
 * 
 * Queries DeepSeek API: https://api.deepseek.com/v1/models
 */

import type { DiscoveredModel, ModelDiscoveryAdapter, ProviderDiscoveryConfig } from '../types';
import { KNOWN_MODEL_OVERRIDES } from '../ModelMetadataOverrides';

export class DeepSeekModelDiscovery implements ModelDiscoveryAdapter {
  readonly provider = "deepseek" as const;

  async listModels(config?: ProviderDiscoveryConfig): Promise<DiscoveredModel[]> {
    if (!config?.apiKey) {
      throw new Error("DeepSeek API key required for live model discovery");
    }

    const baseUrl = config.baseUrl || "https://api.deepseek.com/v1";
    const res = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: config.signal,
    });

    if (!res.ok) {
      throw new Error(`DeepSeek API error (${res.status}): ${await res.text().catch(() => "")}`);
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
    const override = KNOWN_MODEL_OVERRIDES[id];
    const isReasoning = lowerId.includes("reasoner") || lowerId.includes("r1");

    return {
      apiModelId: id,
      displayName: override?.displayName || (isReasoning ? "DeepSeek R1 (Thinking)" : "DeepSeek V3"),
      family: "deepseek",
      contextWindow: override?.contextWindow || 65536,
      maxOutputTokens: override?.maxOutputTokens || 8192,
      createdAt: raw.created ? raw.created * 1000 : undefined,
      capabilities: override?.capabilities || {
        streaming: true,
        reasoning: isReasoning,
        tools: !isReasoning,
        vision: false,
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
