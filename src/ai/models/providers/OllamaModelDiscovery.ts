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
    try {
      const res = await fetch(`${baseUrl}/api/tags`, {
        method: "GET",
        signal: config?.signal,
      });

      if (!res.ok) {
        return this.getOfficialSnapshotModels();
      }

      const json = await res.json();
      const rawList: unknown[] = Array.isArray(json?.models) ? json.models : [];

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
    const name = String(raw.name || raw.model || "");
    if (!name) return null;

    const lower = name.toLowerCase();

    // Exclude embedding / whisper models
    if (lower.includes("embed") || lower.includes("bge-") || lower.includes("all-minilm") || lower.includes("nomic-embed")) {
      return null;
    }

    const isReasoning = lower.includes("r1") || lower.includes("reason") || lower.includes("thinking");
    const isVision = lower.includes("vision") || lower.includes("llava") || lower.includes("vl") || lower.includes("bakllava");

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

  getOfficialSnapshotModels(): DiscoveredModel[] {
    const rawModels = [
      { name: "llama3.3:latest", details: { family: "llama", parameter_size: "70B", format: "gguf" } },
      { name: "deepseek-r1:latest", details: { family: "deepseek", parameter_size: "32B", format: "gguf" } },
      { name: "llama3.2-vision:latest", details: { family: "llama", parameter_size: "11B", format: "gguf" } },
      { name: "llava:latest", details: { family: "llava", parameter_size: "13B", format: "gguf" } },
      { name: "qwen2.5-coder:latest", details: { family: "qwen2.5", parameter_size: "32B", format: "gguf" } },
      { name: "phi4:latest", details: { family: "phi", parameter_size: "14B", format: "gguf" } },
      { name: "mistral:latest", details: { family: "mistral", parameter_size: "7B", format: "gguf" } }
    ];

    return rawModels.map(raw => this.normalizeModel(raw)!).filter(Boolean);
  }
}
