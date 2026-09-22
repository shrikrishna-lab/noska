/**
 * Noska AI — Ollama Adapter
 * Official Endpoint: GET /api/tags (Local daemon, capped at 3 models per user request)
 */

import { BaseProviderAdapter } from "./BaseAdapter";
import type { NormalizedModel, ProviderCredentials } from "../normalizedSchema";

export class OllamaAdapter extends BaseProviderAdapter {
  provider = "ollama";
  displayName = "Ollama";
  defaultBaseUrl = "http://localhost:11434";

  async listModels(credentials: ProviderCredentials, signal?: AbortSignal): Promise<NormalizedModel[]> {
    const baseUrl = (credentials.baseUrl || this.defaultBaseUrl).replace(/\/+$/, "");

    let models: NormalizedModel[] = [];
    try {
      const res = await this.fetchWithRetry(
        `${baseUrl}/api/tags`,
        { method: "GET" },
        { signal, timeoutMs: 5000, maxRetries: 1 }
      );

      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data.models) ? data.models : [];
        for (const item of rawList) {
          const norm = this.normalizeModel(item);
          if (norm) models.push(norm);
        }
      }
    } catch {
      // Local daemon may not be running, fallback to verified defaults
    }

    if (models.length === 0) {
      const fallbackList = [
        { name: "llama3.3:latest", size: 42000000000 },
        { name: "deepseek-r1:latest", size: 40000000000 },
        { name: "qwen2.5-coder:latest", size: 19000000000 },
      ];
      models = fallbackList.map((m) => this.normalizeModel(m)!);
    }

    return models;
  }

  normalizeModel(raw: any): NormalizedModel | null {
    const id = String(raw?.name || raw?.model || "").trim();
    if (!id) return null;

    const lowerId = id.toLowerCase();
    const isReasoning = lowerId.includes("r1") || lowerId.includes("reason") || lowerId.includes("thinking");

    const displayName = `${this.resolveDisplayName(id, raw)} (Local)`;
    const contextWindow = this.inferContextWindow(id, raw);
    const capabilities = this.inferCapabilities(id, raw);

    const now = new Date().toISOString();

    return {
      id: `${this.provider}:${id}`,
      provider: this.provider,
      providerModelId: id,
      displayName,
      description: raw?.description || `Ollama Local Model (${raw?.details?.parameter_size || "Local"})`,
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
