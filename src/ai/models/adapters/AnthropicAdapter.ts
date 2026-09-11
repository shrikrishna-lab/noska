/**
 * Noska AI — Anthropic Adapter
 * Official Endpoint: GET /v1/models with pagination (after_id)
 */

import { BaseProviderAdapter } from "./BaseAdapter";
import type { NormalizedModel, ProviderCredentials } from "../normalizedSchema";

export class AnthropicAdapter extends BaseProviderAdapter {
  provider = "anthropic";
  displayName = "Anthropic";
  defaultBaseUrl = "https://api.anthropic.com/v1";

  async listModels(credentials: ProviderCredentials, signal?: AbortSignal): Promise<NormalizedModel[]> {
    const baseUrl = (credentials.baseUrl || this.defaultBaseUrl).replace(/\/+$/, "");
    const apiKey = credentials.apiKey?.trim();

    if (!apiKey) {
      throw new Error("Anthropic API key is required.");
    }

    const allModels: NormalizedModel[] = [];
    let afterId: string | undefined = undefined;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 10;

    try {
      while (hasMore && pageCount < maxPages) {
        pageCount++;
        const url = new URL(`${baseUrl}/models`);
        url.searchParams.set("limit", "100");
        if (afterId) {
          url.searchParams.set("after_id", afterId);
        }

        const res = await this.fetchWithRetry(
          url.toString(),
          {
            method: "GET",
            headers: {
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "anthropic-dangerous-direct-browser-access": "true",
            },
          },
          { signal }
        );

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(`Anthropic API error (${res.status}): ${errText || res.statusText}`);
        }

        const data = await res.json();
        const rawList = Array.isArray(data.data) ? data.data : [];

        for (const item of rawList) {
          const norm = this.normalizeModel(item);
          if (norm) allModels.push(norm);
        }

        hasMore = Boolean(data.has_more);
        afterId = data.last_id || (rawList.length > 0 ? rawList[rawList.length - 1].id : undefined);
      }
    } catch (err: any) {
      // Fallback if /v1/models returns 404 or unsupported on older proxy
      if (allModels.length === 0) {
        const fallbacks = [
          { id: "claude-3-7-sonnet-20250219", display_name: "Claude 3.7 Sonnet (Hybrid Thinking)" },
          { id: "claude-3-5-sonnet-20241022", display_name: "Claude 3.5 Sonnet" },
          { id: "claude-3-5-haiku-20241022", display_name: "Claude 3.5 Haiku" },
          { id: "claude-3-opus-20240229", display_name: "Claude 3 Opus" },
        ];
        return fallbacks.map((m) => this.normalizeModel(m)!);
      }
    }

    return allModels.sort((a, b) => {
      const tsA = a.providerMetadata?.created_at ? new Date(a.providerMetadata.created_at).getTime() : 0;
      const tsB = b.providerMetadata?.created_at ? new Date(b.providerMetadata.created_at).getTime() : 0;
      if (tsA && tsB && tsA !== tsB) return tsB - tsA;
      return 0;
    });
  }

  normalizeModel(raw: any): NormalizedModel | null {
    const id = String(raw?.id || "").trim();
    if (!id) return null;

    const lowerId = id.toLowerCase();
    const isReasoning = lowerId.includes("3-7") || lowerId.includes("thinking") || lowerId.includes("reason");

    const displayName = this.resolveDisplayName(id, raw);
    const contextWindow = this.inferContextWindow(id, raw);
    const capabilities = this.inferCapabilities(id, raw);

    const now = new Date().toISOString();

    return {
      id: `${this.provider}:${id}`,
      provider: this.provider,
      providerModelId: id,
      displayName,
      description: raw?.description || `Anthropic ${displayName}`,
      type: isReasoning ? "reasoning" : "chat",
      capabilities,
      contextWindow,
      maxOutputTokens: isReasoning ? 64000 : 8192,
      status: "active",
      providerMetadata: typeof raw === "object" ? { ...raw } : { id },
      lastSeenAt: now,
      lastSyncedAt: now,
    };
  }
}
