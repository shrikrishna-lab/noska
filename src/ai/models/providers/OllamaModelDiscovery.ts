/**
 * Ollama Local Model Discovery Adapter
 * 
 * Queries the local Ollama runtime: GET {baseUrl}/api/tags (default http://localhost:11434/api/tags)
 * Returns ONLY models that actually exist locally on the machine.
 */

import type { DiscoveredModel, ModelDiscoveryAdapter, ProviderDiscoveryConfig } from '../types';

export class OllamaModelDiscovery implements ModelDiscoveryAdapter {
  readonly provider = "ollama" as const;

  async listModels(config?: ProviderDiscoveryConfig): Promise<DiscoveredModel[]> {
    const baseUrl = (config?.baseUrl || "http://localhost:11434").replace(/\/+$/, "");
    const res = await fetch(`${baseUrl}/api/tags`, {
      method: "GET",
      signal: config?.signal,
    });

    if (!res.ok) {
      throw new Error(`Ollama runtime unreachable (${res.status})`);
    }

    const json = await res.json();
    const rawList: unknown[] = Array.isArray(json?.models) ? json.models : [];

    const models: DiscoveredModel[] = [];
    for (const raw of rawList) {
      const normalized = this.normalizeModel(raw);
      if (normalized) models.push(normalized);
    }

    return models;
  }

  normalizeModel(raw: any): DiscoveredModel | null {
    if (!raw || typeof raw !== "object") return null;
    const name = String(raw.name || raw.model || "");
    if (!name) return null;

    const lower = name.toLowerCase();

    // Exclude embedding / whisper models
    if (lower.includes("embed") || lower.includes("bge-") || lower.includes("all-minilm") || lower.includes("nomic-embed")) {
      return null;
    }

    const isReasoning = lower.includes("r1") || lower.includes("reason") || lower.includes("thinking");
    const isVision = lower.includes("vision") || lower.includes("llava") || lower.includes("vl");

    // Extract size details if available (e.g. 7B, 70B)
    const parameterSize = raw.details?.parameter_size ? ` (${raw.details.parameter_size})` : "";
    const displayName = `${name}${parameterSize}`;

    return {
      apiModelId: name,
      displayName,
      family: raw.details?.family || "ollama-local",
      contextWindow: 32768, // Ollama default context
      maxOutputTokens: 8192,
      createdAt: raw.modified_at ? new Date(raw.modified_at).getTime() : undefined,
      description: `Local Ollama model · ${raw.details?.format || "GGUF"} ${raw.details?.quantization_level || ""}`,
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
      freeAccess: {
        isFree: false,
        status: "local" as const,
        source: "local" as const,
        verifiedAt: new Date().toISOString(),
        conditions: ["Local Inference"],
      },
      reasoningModes: isReasoning ? ["high"] : undefined,
      status: "available",
      raw,
    };
  }
}
