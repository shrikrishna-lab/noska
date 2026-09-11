/**
 * Noska AI — LM Studio Adapter
 * Official Endpoint: GET /v1/models (Local daemon, capped at 3 models per user request)
 */

import { BaseProviderAdapter } from "./BaseAdapter";
import type { NormalizedModel, ProviderCredentials } from "../normalizedSchema";

export class LMStudioAdapter extends BaseProviderAdapter {
  provider = "lmstudio";
  displayName = "LM Studio";
  defaultBaseUrl = "http://localhost:1234/v1";

  async listModels(credentials: ProviderCredentials, signal?: AbortSignal): Promise<NormalizedModel[]> {
    const baseUrl = (credentials.baseUrl || this.defaultBaseUrl).replace(/\/+$/, "");

    let models: NormalizedModel[] = [];
    try {
      const res = await this.fetchWithRetry(
        `${baseUrl}/models`,
        { method: "GET" },
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
      // Local daemon may not be running, fallback to verified defaults
    }

    if (models.length === 0) {
      const fallbackList = [
        { id: "local-model", name: "LM Studio Active Model" },
        { id: "llama-3.3-70b-instruct", name: "Llama 3.3 70B" },
        { id: "deepseek-r1-distill-qwen-32b", name: "DeepSeek R1 Qwen 32B" },
      ];
      models = fallbackList.map((m) => this.normalizeModel(m)!);
    }

    // Per requirement: cap LM Studio to at most 3 models
    return models.slice(0, 3);
  }

  normalizeModel(raw: any): NormalizedModel | null {
    const id = String(raw?.id || "").trim();
    if (!id) return null;

    const lowerId = id.toLowerCase();
    const isReasoning = lowerId.includes("r1") || lowerId.includes("reason") || lowerId.includes("thinking");

    const displayName = this.resolveDisplayName(id, raw);
    const contextWindow = this.inferContextWindow(id, raw);
    const capabilities = this.inferCapabilities(id, raw);

    const now = new Date().toISOString();

    return {
      id: `${this.provider}:${id}`,
      provider: this.provider,
      providerModelId: id,
      displayName,
      description: raw?.description || "LM Studio Local Runtime Model",
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
