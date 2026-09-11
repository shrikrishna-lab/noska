/**
 * Noska AI — Google Gemini Adapter
 * Official Endpoint: GET /v1beta/models with pagination (nextPageToken)
 */

import { BaseProviderAdapter } from "./BaseAdapter";
import type { NormalizedModel, ProviderCredentials } from "../normalizedSchema";

export class GeminiAdapter extends BaseProviderAdapter {
  provider = "gemini";
  displayName = "Google Gemini";
  defaultBaseUrl = "https://generativelanguage.googleapis.com/v1beta";

  async listModels(credentials: ProviderCredentials, signal?: AbortSignal): Promise<NormalizedModel[]> {
    const baseUrl = (credentials.baseUrl || this.defaultBaseUrl).replace(/\/+$/, "");
    const apiKey = credentials.apiKey?.trim();

    if (!apiKey) {
      throw new Error("Gemini API key is required.");
    }

    const allModels: NormalizedModel[] = [];
    let pageToken: string | undefined = undefined;
    let pageCount = 0;
    const maxPages = 10; // safety ceiling

    do {
      pageCount++;
      const url = new URL(`${baseUrl}/models`);
      url.searchParams.set("pageSize", "50");
      if (pageToken) {
        url.searchParams.set("pageToken", pageToken);
      }

      const res = await this.fetchWithRetry(
        url.toString(),
        {
          method: "GET",
          headers: {
            "x-goog-api-key": apiKey,
          },
        },
        { signal }
      );

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Gemini API error (${res.status}): ${errText || res.statusText}`);
      }

      const data = await res.json();
      const rawList = Array.isArray(data.models) ? data.models : [];

      for (const item of rawList) {
        const norm = this.normalizeModel(item);
        if (norm) allModels.push(norm);
      }

      pageToken = data.nextPageToken || undefined;
    } while (pageToken && pageCount < maxPages);

    return allModels;
  }

  normalizeModel(raw: any): NormalizedModel | null {
    // raw.name is e.g. "models/gemini-2.0-flash"
    const rawName = String(raw?.name || "").trim();
    const id = rawName.replace(/^models\//, "");
    if (!id) return null;

    const lowerId = id.toLowerCase();
    const isEmbedding = lowerId.includes("embedding");
    const isReasoning = lowerId.includes("thinking") || lowerId.includes("reason");

    let type: NormalizedModel["type"] = "chat";
    if (raw?.type && typeof raw.type === "string") {
      type = raw.type as NormalizedModel["type"];
    } else if (isReasoning) {
      type = "reasoning";
    } else if (isEmbedding) {
      type = "embedding";
    }

    const displayName = this.resolveDisplayName(id, raw);
    const inputLimit = Number(raw?.inputTokenLimit || 0);
    const outputLimit = Number(raw?.outputTokenLimit || 0);

    const contextWindow = inputLimit > 0 ? inputLimit : this.inferContextWindow(id, raw);
    const capabilities = this.inferCapabilities(id, raw);

    const now = new Date().toISOString();

    return {
      id: `${this.provider}:${id}`,
      provider: this.provider,
      providerModelId: id,
      displayName,
      description: raw?.description || `Google ${displayName}`,
      type,
      capabilities,
      contextWindow,
      maxOutputTokens: outputLimit > 0 ? outputLimit : 8192,
      status: lowerId.includes("exp") || lowerId.includes("preview") ? "preview" : "active",
      providerMetadata: typeof raw === "object" ? { ...raw } : { id },
      lastSeenAt: now,
      lastSyncedAt: now,
    };
  }
}
