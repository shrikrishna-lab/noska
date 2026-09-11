/**
 * Noska AI — OpenCode Zen Adapter
 * Curated free high-speed models (capped at 3 models per user request)
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
    if (apiKey) {
      try {
        const res = await this.fetchWithRetry(
          `${baseUrl}/models`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${apiKey}` },
          },
          { signal, timeoutMs: 5000, maxRetries: 1 }
        );

        if (res.ok) {
          const data = await res.json();
          const rawList = Array.isArray(data.data) ? data.data : [];
          for (const item of rawList) {
            const norm = this.normalizeModel(item);
            if (norm) models.push(norm);
          }
        }
      } catch {
        // Fallback to verified free models
      }
    }

    if (models.length === 0) {
      const fallbackList = [
        { id: "nemotron-3.5-lightning-free", name: "Nemotron 3.5 Lightning [Free ⚡]" },
        { id: "deepseek-r1-free", name: "DeepSeek R1 [Free ⚡]" },
        { id: "qwen-2.5-coder-32b", name: "Qwen 2.5 Coder 32B [Free ⚡]" },
      ];
      models = fallbackList.map((m) => this.normalizeModel(m)!);
    }

    // Per requirement: cap to at most 3 models
    return models.slice(0, 3);
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
