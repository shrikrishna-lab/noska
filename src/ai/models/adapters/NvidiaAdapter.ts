/**
 * Noska AI — NVIDIA NIM Adapter
 * Official Endpoint: GET /v1/models (capped at 3 curated models per user request)
 */

import { BaseProviderAdapter } from "./BaseAdapter";
import type { NormalizedModel, ProviderCredentials } from "../normalizedSchema";

export class NvidiaAdapter extends BaseProviderAdapter {
  provider = "nvidia";
  displayName = "NVIDIA NIM";
  defaultBaseUrl = "https://integrate.api.nvidia.com/v1";

  async listModels(credentials: ProviderCredentials, signal?: AbortSignal): Promise<NormalizedModel[]> {
    const baseUrl = (credentials.baseUrl || this.defaultBaseUrl).replace(/\/+$/, "");
    const apiKey = credentials.apiKey?.trim();

    if (!apiKey) {
      throw new Error("NVIDIA API key is required.");
    }

    let models: NormalizedModel[] = [];
    try {
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

      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data.data) ? data.data : [];
        for (const item of rawList) {
          const norm = this.normalizeModel(item);
          if (norm) models.push(norm);
        }
      }
    } catch {
      // Fallback to top curated models if live models list is restricted
    }

    if (models.length === 0) {
      const fallbackList = [
        { id: "nvidia/llama-3.1-nemotron-70b-instruct", name: "Llama 3.1 Nemotron 70B" },
        { id: "deepseek-ai/deepseek-r1", name: "DeepSeek R1 (NIM)" },
        { id: "meta/llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct" },
      ];
      models = fallbackList.map((m) => this.normalizeModel(m)!);
    }

    // Per requirement: cap NVIDIA to at most 3 curated models
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
      description: raw?.description || `NVIDIA NIM Hosted ${displayName}`,
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
