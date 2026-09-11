/**
 * Noska AI — OpenAI Adapter
 * Official Endpoint: GET /v1/models
 */

import { BaseProviderAdapter } from "./BaseAdapter";
import type { NormalizedModel, ProviderCredentials } from "../normalizedSchema";

export class OpenAIAdapter extends BaseProviderAdapter {
  provider = "openai";
  displayName = "OpenAI";
  defaultBaseUrl = "https://api.openai.com/v1";

  async listModels(credentials: ProviderCredentials, signal?: AbortSignal): Promise<NormalizedModel[]> {
    const baseUrl = (credentials.baseUrl || this.defaultBaseUrl).replace(/\/+$/, "");
    const apiKey = credentials.apiKey?.trim();

    if (!apiKey) {
      throw new Error("OpenAI API key is required.");
    }

    const res = await this.fetchWithRetry(
      `${baseUrl}/models`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...(credentials.organization ? { "OpenAI-Organization": credentials.organization } : {}),
        },
      },
      { signal }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`OpenAI API error (${res.status}): ${errText || res.statusText}`);
    }

    const data = await res.json();
    const rawList = Array.isArray(data.data) ? data.data : [];

    const models: NormalizedModel[] = [];
    for (const item of rawList) {
      const norm = this.normalizeModel(item);
      if (norm) models.push(norm);
    }

    // Sort by freshness (creation timestamp descending) when available
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
    const isEmbedding = lowerId.includes("embedding") || lowerId.includes("ada");
    const isAudio = lowerId.includes("whisper") || lowerId.includes("tts");
    const isImage = lowerId.includes("dall-e");
    const isModeration = lowerId.includes("moderation");
    const isReasoning = lowerId.startsWith("o1") || lowerId.startsWith("o3") || lowerId.includes("reasoning");

    let type: NormalizedModel["type"] = "chat";
    if (raw?.type && typeof raw.type === "string") {
      type = raw.type as NormalizedModel["type"];
    } else if (isReasoning) {
      type = "reasoning";
    } else if (isEmbedding) {
      type = "embedding";
    } else if (isAudio) {
      type = "audio";
    } else if (isImage) {
      type = "image";
    } else if (isModeration) {
      type = "moderation";
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
      description: raw?.description || `OpenAI ${displayName}`,
      type,
      capabilities,
      contextWindow,
      maxOutputTokens: isReasoning ? 100000 : 16384,
      status: lowerId.includes("preview") ? "preview" : "active",
      providerMetadata: typeof raw === "object" ? { ...raw } : { id },
      lastSeenAt: now,
      lastSyncedAt: now,
    };
  }
}
