/**
 * Noska AI — Groq Adapter
 * Official Endpoint: GET /openai/v1/models
 */

import { BaseProviderAdapter } from "./BaseAdapter";
import type { NormalizedModel, ProviderCredentials } from "../normalizedSchema";

export class GroqAdapter extends BaseProviderAdapter {
  provider = "groq";
  displayName = "Groq";
  defaultBaseUrl = "https://api.groq.com/openai/v1";

  async listModels(credentials: ProviderCredentials, signal?: AbortSignal): Promise<NormalizedModel[]> {
    const baseUrl = (credentials.baseUrl || this.defaultBaseUrl).replace(/\/+$/, "");
    const apiKey = credentials.apiKey?.trim();

    if (!apiKey) {
      throw new Error("Groq API key is required.");
    }

    const res = await this.fetchWithRetry(
      `${baseUrl}/models`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
      { signal }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Groq API error (${res.status}): ${errText || res.statusText}`);
    }

    const data = await res.json();
    const rawList = Array.isArray(data.data) ? data.data : [];

    const models: NormalizedModel[] = [];
    for (const item of rawList) {
      const norm = this.normalizeModel(item);
      if (norm) models.push(norm);
    }

    return models.sort((a, b) => {
      const tsA = Number(a.providerMetadata?.created) || 0;
      const tsB = Number(b.providerMetadata?.created) || 0;
      if (tsA && tsB && tsA !== tsB) return tsB - tsA;
      return 0;
    });
  }

  normalizeModel(raw: any): NormalizedModel | null {
    const id = String(raw?.id || "").trim();
    if (!id) return null;

    const lowerId = id.toLowerCase();
    const isAudio = lowerId.includes("whisper");
    const isReasoning = lowerId.includes("r1") || lowerId.includes("reason") || lowerId.includes("thinking");

    let type: NormalizedModel["type"] = "chat";
    if (raw?.type && typeof raw.type === "string") {
      type = raw.type as NormalizedModel["type"];
    } else if (isReasoning) {
      type = "reasoning";
    } else if (isAudio) {
      type = "audio";
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
      description: raw?.description || `Groq LPUs Ultra-Fast ${displayName}`,
      type,
      capabilities,
      contextWindow,
      maxOutputTokens: 8192,
      status: raw?.active === false ? "deprecated" : "active",
      providerMetadata: typeof raw === "object" ? { ...raw } : { id },
      lastSeenAt: now,
      lastSyncedAt: now,
    };
  }
}
