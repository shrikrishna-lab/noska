/**
 * Noska AI — Cohere Adapter
 * Official Endpoint: GET /v1/models with pagination (page_token)
 */

import { BaseProviderAdapter } from "./BaseAdapter";
import type { NormalizedModel, ProviderCredentials } from "../normalizedSchema";

export class CohereAdapter extends BaseProviderAdapter {
  provider = "cohere";
  displayName = "Cohere";
  defaultBaseUrl = "https://api.cohere.com/v1";

  async listModels(credentials: ProviderCredentials, signal?: AbortSignal): Promise<NormalizedModel[]> {
    const baseUrl = (credentials.baseUrl || this.defaultBaseUrl).replace(/\/+$/, "");
    const apiKey = credentials.apiKey?.trim();

    if (!apiKey) {
      throw new Error("Cohere API key is required.");
    }

    const allModels: NormalizedModel[] = [];
    let pageToken: string | undefined = undefined;
    let pageCount = 0;
    const maxPages = 10;

    do {
      pageCount++;
      const url = new URL(`${baseUrl}/models`);
      url.searchParams.set("page_size", "100");
      if (pageToken) {
        url.searchParams.set("page_token", pageToken);
      }

      const res = await this.fetchWithRetry(
        url.toString(),
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
        throw new Error(`Cohere API error (${res.status}): ${errText || res.statusText}`);
      }

      const data = await res.json();
      const rawList = Array.isArray(data.models) ? data.models : [];

      for (const item of rawList) {
        const norm = this.normalizeModel(item);
        if (norm) allModels.push(norm);
      }

      pageToken = data.next_page_token || undefined;
    } while (pageToken && pageCount < maxPages);

    return allModels;
  }

  normalizeModel(raw: any): NormalizedModel | null {
    const id = String(raw?.name || raw?.id || "").trim();
    if (!id) return null;

    const lowerId = id.toLowerCase();
    const isEmbedding = lowerId.includes("embed");
    const isRerank = lowerId.includes("rerank");

    let type: NormalizedModel["type"] = "chat";
    if (raw?.type && typeof raw.type === "string") {
      type = raw.type as NormalizedModel["type"];
    } else if (isEmbedding) {
      type = "embedding";
    } else if (isRerank) {
      type = "completion";
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
      description: raw?.description || `Cohere ${displayName}`,
      type,
      capabilities,
      contextWindow,
      maxOutputTokens: 4096,
      status: "active",
      providerMetadata: typeof raw === "object" ? { ...raw } : { id },
      lastSeenAt: now,
      lastSyncedAt: now,
    };
  }
}
