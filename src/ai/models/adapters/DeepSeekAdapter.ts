/**
 * Noska AI — DeepSeek Adapter
 * Official Endpoint: GET /v1/models
 */

import { BaseProviderAdapter } from "./BaseAdapter";
import type { NormalizedModel, ProviderCredentials } from "../normalizedSchema";

export class DeepSeekAdapter extends BaseProviderAdapter {
  provider = "deepseek";
  displayName = "DeepSeek";
  defaultBaseUrl = "https://api.deepseek.com/v1";

  async listModels(credentials: ProviderCredentials, signal?: AbortSignal): Promise<NormalizedModel[]> {
    const baseUrl = (credentials.baseUrl || this.defaultBaseUrl).replace(/\/+$/, "");
    const apiKey = credentials.apiKey?.trim();

    if (!apiKey) {
      throw new Error("DeepSeek API key is required.");
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
      throw new Error(`DeepSeek API error (${res.status}): ${errText || res.statusText}`);
    }

    const data = await res.json();
    const rawList = Array.isArray(data.data) ? data.data : [];

    const models: NormalizedModel[] = [];
    for (const item of rawList) {
      const norm = this.normalizeModel(item);
      if (norm) models.push(norm);
    }

    // If API returns empty array, provide verified models
    if (models.length === 0) {
      const verified = [
        { id: "deepseek-reasoner", name: "DeepSeek R1 (Thinking)" },
        { id: "deepseek-chat", name: "DeepSeek V3 (671B)" },
        { id: "deepseek-coder", name: "DeepSeek Coder V2.5" },
      ];
      return verified.map((m) => this.normalizeModel(m)!);
    }

    return models;
  }

  normalizeModel(raw: any): NormalizedModel | null {
    const id = String(raw?.id || "").trim();
    if (!id) return null;

    const lowerId = id.toLowerCase();
    const isReasoning = lowerId.includes("reasoner") || lowerId.includes("r1") || lowerId.includes("thinking") || lowerId.includes("reason");
    const displayName = this.resolveDisplayName(id, raw);
    const contextWindow = this.inferContextWindow(id, raw);
    const capabilities = this.inferCapabilities(id, raw);

    const now = new Date().toISOString();

    return {
      id: `${this.provider}:${id}`,
      provider: this.provider,
      providerModelId: id,
      displayName,
      description: raw?.description || `DeepSeek ${displayName}`,
      type: isReasoning ? "reasoning" : "chat",
      capabilities,
      contextWindow,
      maxOutputTokens: isReasoning ? 32000 : 8192,
      status: "active",
      providerMetadata: typeof raw === "object" ? { ...raw } : { id },
      lastSeenAt: now,
      lastSyncedAt: now,
    };
  }
}
