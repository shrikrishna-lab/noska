/**
 * Noska AI — OpenCode Zen Adapter
 * Fetches the full live catalog from GET /models (public endpoint).
 */

import { BaseProviderAdapter } from "./BaseAdapter";
import type { NormalizedModel, ProviderCredentials } from "../normalizedSchema";

export class OpenCodeZenAdapter extends BaseProviderAdapter {
  provider = "opencode_zen";
  displayName = "OpenCode Zen";
  defaultBaseUrl = "https://opencode.ai/zen/v1";

  async listModels(credentials: ProviderCredentials, signal?: AbortSignal): Promise<NormalizedModel[]> {
    const baseUrl = (credentials.baseUrl || this.defaultBaseUrl).replace(/\/+$/, "");
    const apiKey = credentials.apiKey?.trim();

    let models: NormalizedModel[] = [];
    // /models is a public catalog — try even without an API key so unconfigured
    // users still see the full list (mimo, muse, etc.).
    try {
      const headers: Record<string, string> = {};
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      const res = await this.fetchWithRetry(
        `${baseUrl}/models`,
        { method: "GET", headers },
        { signal, timeoutMs: 8000, maxRetries: 1 }
      );

      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
        for (const item of rawList) {
          const norm = this.normalizeModel(item);
          if (norm) models.push(norm);
        }
      }
    } catch {
      // Fallback to verified free models below
    }

    if (models.length === 0) {
      const fallbackList = [
        { id: "nemotron-3.5-lightning-free", name: "Nemotron 3.5 Lightning [Free ⚡]" },
        { id: "mimo-v2.6-flash-free", name: "MiMo V2.6 Flash [Free]" },
        { id: "muse-spark-1.3-contributor-free", name: "Muse Spark 1.3 Contributor [Free]" },
        { id: "deepseek-v4-flash-free", name: "DeepSeek V4 Flash [Free]" },
        { id: "mimo-v2.5-free", name: "MiMo V2.5 [Free]" },
        { id: "big-pickle", name: "Big Pickle [Free]" },
      ];
      models = fallbackList.map((m) => this.normalizeModel(m)!);
    }

    return models;
  }

  normalizeModel(raw: any): NormalizedModel | null {
    const id = String(raw?.id || "").trim();
    if (!id) return null;

    const lowerId = id.toLowerCase();
    const isReasoning = lowerId.includes("r1") || lowerId.includes("nemotron") || lowerId.includes("reason") || lowerId.includes("thinking");

    const displayName = this.resolveDisplayName(id, raw);
    const contextWindow = this.inferContextWindow(id, raw);
    const capabilities = this.inferCapabilities(id, raw);

    const now = new Date().toISOString();

    return {
      id: `${this.provider}:${id}`,
      provider: this.provider,
      providerModelId: id,
      displayName,
      description: raw?.description || "OpenCode Zen Free Cloud Model",
      type: isReasoning ? "reasoning" : "chat",
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
