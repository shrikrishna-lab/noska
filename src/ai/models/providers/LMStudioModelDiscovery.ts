/**
 * LM Studio Local Model Discovery Adapter
 * 
 * Queries the connected LM Studio server: GET {baseUrl}/models (default http://localhost:1234/v1/models)
 * Returns ALL models exposed as available by the connected LM Studio server, distinguishing
 * available vs loaded vs ready states so unloaded models remain visible in the catalog.
 */

import type { DiscoveredModel, ModelDiscoveryAdapter, ProviderDiscoveryConfig } from '../types';

export class LMStudioModelDiscovery implements ModelDiscoveryAdapter {
  readonly provider = "lmstudio" as const;

  async listModels(config?: ProviderDiscoveryConfig): Promise<DiscoveredModel[]> {
    const baseUrl = (config?.baseUrl || "http://localhost:1234/v1").replace(/\/+$/, "");
    const res = await fetch(`${baseUrl}/models`, {
      method: "GET",
      signal: config?.signal,
    });

    if (!res.ok) {
      throw new Error(`LM Studio runtime unreachable (${res.status})`);
    }

    const json = await res.json();
    const rawList: unknown[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];

    const models: DiscoveredModel[] = [];
    for (const raw of rawList) {
      const normalized = this.normalizeModel(raw);
      if (normalized) models.push(normalized);
    }

    return models;
  }

  normalizeModel(raw: any): DiscoveredModel | null {
    if (!raw || typeof raw !== "object") return null;
    const id = String(raw.id || raw.name || "");
    if (!id) return null;

    const lower = id.toLowerCase();

    // Exclude embedding & non-chat models
    if (lower.includes("embed") || lower.includes("bge-") || lower.includes("all-minilm") || lower.includes("moderation")) {
      return null;
    }

    const isReasoning = lower.includes("r1") || lower.includes("reason") || lower.includes("thinking");
    const isVision = lower.includes("vision") || lower.includes("vl");

    // Clean up display name from local path / gguf filename if applicable
    let displayName = id;
    if (displayName.includes("/")) {
      const parts = displayName.split("/");
      displayName = parts[parts.length - 1];
    }
    displayName = displayName.replace(/\.gguf$/i, "").replace(/[-_]/g, " ");

    // Determine local state: available, loaded, ready
    const isLoaded = Boolean(
      raw.state === "loaded" ||
      raw.loaded === true ||
      raw.active === true ||
      raw.status === "loaded" ||
      raw.is_loaded === true
    );

    return {
      apiModelId: id,
      displayName,
      family: "lmstudio-local",
      contextWindow: typeof raw.context_length === "number" ? raw.context_length : 32768,
      maxOutputTokens: 8192,
      createdAt: raw.created ? raw.created * 1000 : undefined,
      description: isLoaded ? "Loaded in LM Studio (Ready for inference)" : "Available in LM Studio (Unloaded)",
      localState: {
        available: true,
        loaded: isLoaded,
        ready: isLoaded,
      },
      capabilities: {
        streaming: true,
        reasoning: isReasoning,
        tools: !isReasoning,
        vision: isVision,
        audio: false,
        video: false,
        imageGeneration: false,
        structuredOutput: true,
        mcp: true,
        agentMode: true,
      },
      freeAccess: {
        isFree: false,
        status: "local" as const,
        source: "local" as const,
        verifiedAt: new Date().toISOString(),
        conditions: ["Local Inference"],
      },
      reasoningModes: isReasoning ? ["high"] : undefined,
      status: "available",
      raw,
    };
  }
}

