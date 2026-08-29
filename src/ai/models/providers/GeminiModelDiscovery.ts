/**
 * Google Gemini Dynamic Model Discovery Adapter
 * 
 * Queries Google Generative Language API: https://generativelanguage.googleapis.com/v1beta/models
 * Filters for models supporting generateContent.
 */

import type { DiscoveredModel, ModelDiscoveryAdapter, ProviderDiscoveryConfig } from '../types';

export class GeminiModelDiscovery implements ModelDiscoveryAdapter {
  readonly provider = "gemini" as const;

  async listModels(config?: ProviderDiscoveryConfig): Promise<DiscoveredModel[]> {
    if (!config?.apiKey) {
      throw new Error("Gemini API key required for live model discovery");
    }

    const baseUrl = config.baseUrl || "https://generativelanguage.googleapis.com/v1beta";
    const res = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": config.apiKey,
      },
      signal: config.signal,
    });

    if (!res.ok) {
      throw new Error(`Gemini API error (${res.status}): ${await res.text().catch(() => "")}`);
    }

    const json = await res.json();
    const rawList: unknown[] = Array.isArray(json?.models) ? json.models : [];

    const models: DiscoveredModel[] = [];
    for (const raw of rawList) {
      const normalized = this.normalizeModel(raw);
      if (normalized) models.push(normalized);
    }

    return models;
  }

  normalizeModel(raw: any): DiscoveredModel | null {
    if (!raw || typeof raw !== "object") return null;

    // raw.name is formatted like "models/gemini-2.5-flash"
    const fullName = String(raw.name || "");
    const modelId = fullName.replace(/^models\//, "");
    if (!modelId) return null;

    const lowerId = modelId.toLowerCase();

    // Exclude embedding, aqa, text-only legacy, or experimental image generation
    if (
      lowerId.includes("embedding") ||
      lowerId.includes("aqa") ||
      lowerId.includes("imagen") ||
      lowerId.includes("1.0")
    ) {
      return null;
    }

    // Verify supportedGenerationMethods contains generateContent
    const methods: string[] = Array.isArray(raw.supportedGenerationMethods)
      ? raw.supportedGenerationMethods
      : [];
    if (methods.length > 0 && !methods.includes("generateContent")) {
      return null;
    }

    const inputTokens = typeof raw.inputTokenLimit === "number" ? raw.inputTokenLimit : 1048576;
    const outputTokens = typeof raw.outputTokenLimit === "number" ? raw.outputTokenLimit : 8192;

    const isPro = lowerId.includes("pro");
    const isFlash = lowerId.includes("flash") || lowerId.includes("lite");
    const isReasoning = lowerId.includes("thinking") || lowerId.includes("2.5") || lowerId.includes("2.0-flash");

    const freeAccess = isFlash
      ? {
          isFree: true,
          status: "free_limited" as const,
          source: "provider" as const,
          verifiedAt: new Date().toISOString(),
          conditions: ["Google AI Studio Free Tier (15 RPM)"],
        }
      : {
          isFree: false,
          status: "paid" as const,
          source: "provider" as const,
          verifiedAt: new Date().toISOString(),
        };

    return {
      apiModelId: modelId,
      displayName: raw.displayName ? String(raw.displayName) : modelId,
      family: "gemini",
      version: raw.version ? String(raw.version) : undefined,
      contextWindow: inputTokens,
      maxOutputTokens: outputTokens,
      freeAccess,
      description: raw.description ? String(raw.description).slice(0, 200) : undefined,
      capabilities: {
        streaming: true,
        reasoning: isReasoning,
        tools: true,
        vision: true,
        audio: true,
        video: true,
        imageGeneration: false,
        structuredOutput: true,
        mcp: true,
        agentMode: true,
      },
      reasoningModes: isReasoning ? ["low", "medium", "high"] : undefined,
      status: lowerId.includes("preview") || lowerId.includes("exp") ? "preview" : "available",
      raw,
    };
  }
}
