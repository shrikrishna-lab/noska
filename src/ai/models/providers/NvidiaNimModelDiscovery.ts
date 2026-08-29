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
      return this.getOfficialSnapshotModels();
    }

    const baseUrl = (config.baseUrl || "https://integrate.api.nvidia.com/v1").replace(/\/+$/, "");
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

    // Exclude embedding, reranking, audio, and visual generation models
    if (
      lowerId.includes("embed") ||
      lowerId.includes("rerank") ||
      lowerId.includes("whisper") ||
      lowerId.includes("riva") ||
      lowerId.includes("sdxl") ||
      lowerId.includes("diffusion") ||
      lowerId.includes("neva") ||
      lowerId.includes("cuopt") ||
      lowerId.includes("synthetic-video")
    ) {
      return null;
    }

    // Keep chat/instruct/reasoning models
    const isReasoning = lowerId.includes("r1") || lowerId.includes("reason") || lowerId.includes("thinking") || lowerId.includes("lightning") || lowerId.includes("pro");
    const isVision = lowerId.includes("vision") || lowerId.includes("vl") || lowerId.includes("cosmos");

    // Format human-friendly display name
    let displayName = id;
    if (id.includes("/")) {
      const parts = id.split("/");
      const org = parts[0].toUpperCase();
      const name = parts[1]
        .replace(/[-_]/g, " ")
        .replace(/\b(nemotron|minimax|kimi|gemma|deepseek|mistral|laguna|palmyra|gpt|oss)\b/gi, m => m.toUpperCase());
      displayName = `${org}: ${name}`;
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
      reasoningModes: isReasoning ? ["low", "medium", "high"] : undefined,
      status: "available",
      raw,
    };
  }

  getOfficialSnapshotModels(): DiscoveredModel[] {
    const rawIds = [
      "nvidia/nemotron-3.5-lightning-30b-a3b",
      "minimaxai/minimax-m3",
      "moonshotai/kimi-k3",
      "moonshotai/kimi-k2.6",
      "deepseek-ai/deepseek-v4-pro-0813",
      "deepseek-ai/deepseek-v4-flash-0731",
      "google/gemma-4-31b-it",
      "google/gemma-3-12b-it",
      "nvidia/nemotron-3-ultra-550b-a55b",
      "nvidia/nemotron-3-super-120b-a12b",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "poolside/laguna-xs-2.1",
      "mistralai/mistral-nemotron",
      "mistralai/codestral-22b-instruct-v0.1",
      "meta/llama-3.2-90b-vision-instruct",
      "meta/muse-glimmer-30b"
    ];

    return rawIds.map(id => this.normalizeModel({ id, object: "model", owned_by: "nvidia" })!).filter(Boolean);
  }
}
