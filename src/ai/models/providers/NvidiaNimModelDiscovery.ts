/**
 * NVIDIA NIM Dynamic Model Discovery Adapter
 * 
 * Queries the connected NVIDIA NIM deployment endpoint:
 *   GET {baseUrl}/models (default https://integrate.api.nvidia.com/v1/models)
 * Distinguishes models actually exposed on the connected deployment from static catalogs.
 */

import type { DiscoveredModel, ModelDiscoveryAdapter, ProviderDiscoveryConfig } from '../types';

export class NvidiaNimModelDiscovery implements ModelDiscoveryAdapter {
  readonly provider = "nvidia" as const;

  async listModels(config?: ProviderDiscoveryConfig): Promise<DiscoveredModel[]> {
    if (!config?.apiKey) {
      throw new Error("NVIDIA API key required for live NIM model discovery");
    }

    const baseUrl = (config.baseUrl || "https://integrate.api.nvidia.com/v1").replace(/\/+$/, "");
    const res = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: config.signal,
    });

    if (!res.ok) {
      throw new Error(`NVIDIA NIM API error (${res.status}): ${await res.text().catch(() => "")}`);
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

    // Exclude embedding, reranking, audio, and visual generation models
    if (
      lowerId.includes("embed") ||
      lowerId.includes("rerank") ||
      lowerId.includes("whisper") ||
      lowerId.includes("riva") ||
      lowerId.includes("sdxl") ||
      lowerId.includes("diffusion") ||
      lowerId.includes("neva") ||
      lowerId.includes("cuopt")
    ) {
      return null;
    }

    // Keep chat/instruct/reasoning models
    const isReasoning = lowerId.includes("r1") || lowerId.includes("reason") || lowerId.includes("thinking");
    const isVision = lowerId.includes("vision") || lowerId.includes("vl");

    // Format human-friendly display name
    let displayName = id;
    if (id.includes("/")) {
      const parts = id.split("/");
      displayName = `${parts[0].toUpperCase()} ${parts[1].replace(/[-_]/g, " ")}`;
    }

    return {
      apiModelId: id,
      displayName,
      family: "nvidia-nim",
      contextWindow: 131072,
      maxOutputTokens: 8192,
      createdAt: raw.created ? raw.created * 1000 : undefined,
      capabilities: {
        streaming: true,
        reasoning: isReasoning,
        tools: !isReasoning,
        vision: isVision,
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
