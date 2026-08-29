/**
 * Anthropic Dynamic Model Discovery Adapter
 * 
 * Queries Anthropic Models API: https://api.anthropic.com/v1/models
 */

import type { DiscoveredModel, ModelDiscoveryAdapter, ProviderDiscoveryConfig } from '../types';
import { KNOWN_MODEL_OVERRIDES } from '../ModelMetadataOverrides';

export class AnthropicModelDiscovery implements ModelDiscoveryAdapter {
  readonly provider = "anthropic" as const;

  async listModels(config?: ProviderDiscoveryConfig): Promise<DiscoveredModel[]> {
    if (!config?.apiKey) {
      return this.getOfficialSnapshotModels();
    }

    const baseUrl = config.baseUrl || "https://api.anthropic.com/v1";
    try {
      const res = await fetch(`${baseUrl}/models`, {
        method: "GET",
        headers: {
          "x-api-key": config.apiKey.trim(),
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
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

    // Exclude retired Claude 1 / 2
    if (lowerId.includes("claude-1") || lowerId.includes("claude-2") || lowerId.includes("claude-instant")) {
      return null;
    }

    const override = KNOWN_MODEL_OVERRIDES[id];
    if (override?.status === "shutdown") return null;

    const name = raw.display_name ? String(raw.display_name) : override?.displayName || id;
    const isReasoning = Boolean(
      raw.capabilities?.thinking ||
      raw.thinking ||
      lowerId.includes("thinking") ||
      lowerId.includes("reason") ||
      lowerId.includes("3-7") ||
      lowerId.includes("3.7")
    );

    // Extract family dynamically: e.g. "claude-3-7-sonnet" -> "claude-3.7"
    const familyMatch = lowerId.match(/claude[-_]?(\d+(?:[-.]\d+)?)/);
    const family = override?.family || (familyMatch ? `claude-${familyMatch[1].replace("-", ".")}` : "claude");

    return {
      apiModelId: id,
      displayName: name,
      family,
      contextWindow: override?.contextWindow || 200000,
      maxOutputTokens: override?.maxOutputTokens || (isReasoning ? 64000 : 8192),
      createdAt: raw.created_at ? new Date(raw.created_at).getTime() : undefined,
      capabilities: override?.capabilities || {
        streaming: true,
        reasoning: isReasoning,
        tools: true,
        vision: true,
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
      "claude-opus-5",
      "claude-sonnet-5",
      "claude-fable-5",
      "claude-mythos-5",
      "claude-haiku-4-5",
      "claude-3-7-sonnet-20250219",
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229"
    ];

    return rawIds.map(id => this.normalizeModel({ id, object: "model", display_name: id })!).filter(Boolean);
  }
}
