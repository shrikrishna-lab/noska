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
      // Last-resort list for when GET /models is unreachable. Verified against
      // the live catalog 2026-10-10. The previous list named
      // deepseek-v4-flash-free (400 "Model is unavailable") and mimo-v2.5-free
      // (410 ModelDeprecated) — neither exists any more.
      //
      // Free ids are kept so offline users still see the free tier, but they
      // are listed after the models that actually respond to an API key:
      // Zen answers 403 FreeTierError for every "*-free" model except
      // space-bunny-free when the caller is not the OpenCode client.
      const fallbackList = [
        { id: "space-bunny-free", name: "Space Bunny (Free)" },
        { id: "big-pickle", name: "Big Pickle" },
        { id: "claude-sonnet-5", name: "Claude Sonnet 5 (Zen)" },
        { id: "claude-opus-5", name: "Claude Opus 5 (Zen)" },
        { id: "gpt-5.6-sol", name: "GPT-5.6 Sol (Zen)" },
        { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash (Zen)" },
        { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro (Zen)" },
        { id: "qwen3.8-flash", name: "Qwen 3.8 Flash (Zen)" },
        { id: "mimo-v2.6-flash-free", name: "MiMo V2.6 Flash (Free)" },
        { id: "nemotron-3.5-lightning-free", name: "Nemotron 3.5 Lightning (Free)" },
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
      description: raw?.description || "OpenCode Zen Model",
      type: isReasoning ? "reasoning" : "chat",
      capabilities,
      contextWindow,
      // Zen's /models payload carries no max-output field, so this was a flat
      // 4096 for every model — well under what the current models accept and
      // enough to truncate long Claude/GPT responses.
      maxOutputTokens: 8192,
      status: "active",
      providerMetadata: typeof raw === "object" ? { ...raw } : { id },
      lastSeenAt: now,
      lastSyncedAt: now,
    };
  }
}
