/**
 * Groq Dynamic Model Discovery Adapter
 * 
 * Queries Groq Models API: https://api.groq.com/openai/v1/models
 */

import type { DiscoveredModel, ModelDiscoveryAdapter, ProviderDiscoveryConfig } from '../types';
import { KNOWN_MODEL_OVERRIDES } from '../ModelMetadataOverrides';

export class GroqModelDiscovery implements ModelDiscoveryAdapter {
  readonly provider = "groq" as const;

  async listModels(config?: ProviderDiscoveryConfig): Promise<DiscoveredModel[]> {
    if (!config?.apiKey) {
      return this.getOfficialSnapshotModels();
    }

    const baseUrl = config.baseUrl || "https://api.groq.com/openai/v1";
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

    // Filter out inactive models
    if (raw.active === false) return null;

    const lowerId = id.toLowerCase();

    // Filter out whisper, audio, guard, embedding, and decommissioned models
    if (
      lowerId.includes("whisper") ||
      lowerId.includes("audio") ||
      lowerId.includes("guard") ||
      lowerId.includes("embed") ||
      lowerId.includes("gemma2-9b-it")
    ) {
      return null;
    }

    const override = KNOWN_MODEL_OVERRIDES[id];
    if (override?.status === "shutdown") return null;

    const context = typeof raw.context_window === "number" ? raw.context_window : (override?.contextWindow || 128000);
    const isReasoning = lowerId.includes("r1") || lowerId.includes("reason") || lowerId.includes("thinking");

    return {
      apiModelId: id,
      displayName: override?.displayName || id,
      family: override?.family || "groq-fast",
      contextWindow: context,
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
      freeAccess: {
        isFree: true,
        status: "free_limited" as const,
        source: "provider" as const,
        verifiedAt: new Date().toISOString(),
        conditions: ["Groq Developer Free Tier (Rate Limited)"],
      },
      reasoningModes: isReasoning ? ["high"] : undefined,
      status: "available",
      raw,
    };
  }

  getOfficialSnapshotModels(): DiscoveredModel[] {
    const rawIds = [
      "openai/gpt-oss-120b",
      "qwen/qwen3.8-27b",
      "qwen/qwen3.6-27b",
      "groq/compound",
      "openai/gpt-oss-20b",
      "meta-llama/llama-prompt-guard-2-86m",
      "allam-2-7b"
    ];

    return rawIds.map(id => this.normalizeModel({ id, object: "model", active: true })!).filter(Boolean);
  }
}
