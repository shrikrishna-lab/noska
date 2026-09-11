/**
 * Noska AI — OpenRouter Adapter
 * Official Endpoint: GET /api/v1/models
 */

import { BaseProviderAdapter } from "./BaseAdapter";
import type { NormalizedModel, ProviderCredentials } from "../normalizedSchema";

export class OpenRouterAdapter extends BaseProviderAdapter {
  provider = "openrouter";
  displayName = "OpenRouter";
  defaultBaseUrl = "https://openrouter.ai/api/v1";

  async listModels(credentials: ProviderCredentials, signal?: AbortSignal): Promise<NormalizedModel[]> {
    const baseUrl = (credentials.baseUrl || this.defaultBaseUrl).replace(/\/+$/, "");
    const apiKey = credentials.apiKey?.trim();

    const headers: Record<string, string> = {
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://noska.ai",
      "X-Title": "Noska",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const res = await this.fetchWithRetry(
      `${baseUrl}/models`,
      {
        method: "GET",
        headers,
      },
      { signal }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`OpenRouter API error (${res.status}): ${errText || res.statusText}`);
    }

    const data = await res.json();
    const rawList = Array.isArray(data.data) ? data.data : [];

    const models: NormalizedModel[] = [];
    for (const item of rawList) {
      const norm = this.normalizeModel(item);
      if (norm) models.push(norm);
    }

    return models;
  }

  normalizeModel(raw: any): NormalizedModel | null {
    const id = String(raw?.id || "").trim();
    if (!id) return null;

    const lowerId = id.toLowerCase();
    const isReasoning = lowerId.includes("reason") || lowerId.includes("thinking") || lowerId.includes("r1");
    const isEmbedding = lowerId.includes("embed");

    let type: NormalizedModel["type"] = "chat";
    if (raw?.type && typeof raw.type === "string") {
      type = raw.type as NormalizedModel["type"];
    } else if (isReasoning) {
      type = "reasoning";
    } else if (isEmbedding) {
      type = "embedding";
    }

    const displayName = this.resolveDisplayName(id, raw);
    const contextWindow = this.inferContextWindow(id, raw);
    const capabilities = this.inferCapabilities(id, raw);

    const now = new Date().toISOString();

    return {
      id: `${this.provider}:${id}`,
      provider: this.provider,
      providerModelId: id,
      displayName,
      description: raw?.description || `OpenRouter ${displayName}`,
      type,
      capabilities,
      contextWindow,
      maxOutputTokens: Number(raw?.top_provider?.max_completion_tokens || 8192),
      pricing: raw?.pricing
        ? {
            prompt: Number(raw.pricing.prompt) * 1000000,
            completion: Number(raw.pricing.completion) * 1000000,
            unit: "per_1m_tokens",
          }
        : undefined,
      status: "active",
      providerMetadata: typeof raw === "object" ? { ...raw } : { id },
      lastSeenAt: now,
      lastSyncedAt: now,
    };
  }
}
