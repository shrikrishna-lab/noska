/**
 * Noska AI — Dynamic Model Discovery Service
 * 
 * Orchestrates live & local model discovery across all 12 supported providers:
 *   OpenRouter, Gemini, OpenAI, Anthropic, Groq, DeepSeek,
 *   Mistral, Together, xAI, NVIDIA NIM, Ollama, LM Studio.
 * 
 * Rules:
 * - Dynamic discovery via official APIs and local runtimes.
 * - Normalized NoskaModel representation.
 * - Filter deprecated/shutdown/non-chat models.
 * - Rank by freshness + capability completeness + relevance.
 * - Keep UP TO 8 models per provider (never fabricate models).
 * - Cache results with automatic fallback.
 */

import type {
  DiscoveredModel,
  ModelDiscoveryAdapter,
  NoskaModel,
  ProviderDiscoveryConfig,
  ProviderDiscoveryResult,
  ProviderId,
} from './types';
import { modelCatalogCache } from './ModelCatalogCache';
import { KNOWN_MODEL_OVERRIDES, formatDefaultDisplayName, inferModelCapabilities } from './ModelMetadataOverrides';

// ─── Import All 12 Provider Adapters ────────────────────────────────────────

import { OpenRouterModelDiscovery } from './providers/OpenRouterModelDiscovery';
import { GeminiModelDiscovery } from './providers/GeminiModelDiscovery';
import { OpenAIModelDiscovery } from './providers/OpenAIModelDiscovery';
import { AnthropicModelDiscovery } from './providers/AnthropicModelDiscovery';
import { GroqModelDiscovery } from './providers/GroqModelDiscovery';
import { DeepSeekModelDiscovery } from './providers/DeepSeekModelDiscovery';
import { MistralModelDiscovery } from './providers/MistralModelDiscovery';
import { TogetherModelDiscovery } from './providers/TogetherModelDiscovery';
import { XAIModelDiscovery } from './providers/XAIModelDiscovery';
import { NvidiaNimModelDiscovery } from './providers/NvidiaNimModelDiscovery';
import { OpencodeZenModelDiscovery } from './providers/OpencodeZenModelDiscovery';
import { OllamaModelDiscovery } from './providers/OllamaModelDiscovery';
import { LMStudioModelDiscovery } from './providers/LMStudioModelDiscovery';

export const MAX_LATEST_MODELS = 10;
export const MAX_MODELS_PER_PROVIDER = 10;

export class ModelDiscoveryService {
  private static _instance: ModelDiscoveryService;
  private _adapters: Map<ProviderId, ModelDiscoveryAdapter> = new Map();

  public static getInstance(): ModelDiscoveryService {
    if (!ModelDiscoveryService._instance) {
      ModelDiscoveryService._instance = new ModelDiscoveryService();
    }
    return ModelDiscoveryService._instance;
  }

  constructor() {
    this._registerAdapters();
  }

  private _registerAdapters(): void {
    const list: ModelDiscoveryAdapter[] = [
      new OpenRouterModelDiscovery(),
      new GeminiModelDiscovery(),
      new OpenAIModelDiscovery(),
      new AnthropicModelDiscovery(),
      new GroqModelDiscovery(),
      new DeepSeekModelDiscovery(),
      new MistralModelDiscovery(),
      new TogetherModelDiscovery(),
      new XAIModelDiscovery(),
      new NvidiaNimModelDiscovery(),
      new OpencodeZenModelDiscovery(),
      new OllamaModelDiscovery(),
      new LMStudioModelDiscovery(),
    ];
    for (const a of list) {
      this._adapters.set(a.provider, a);
    }
  }

  public getAdapter(provider: ProviderId): ModelDiscoveryAdapter | null {
    return this._adapters.get(provider) || null;
  }

  /**
   * Discover and rank models for a single provider.
   * Preserves the COMPLETE valid catalog in ModelRegistry while computing Latest (up to 10).
   */
  public async discoverForProvider(
    provider: ProviderId,
    config?: ProviderDiscoveryConfig
  ): Promise<ProviderDiscoveryResult> {
    const adapter = this._adapters.get(provider);
    if (!adapter) {
      return {
        provider,
        models: [],
        fetchedCount: 0,
        filteredCount: 0,
        displayedCount: 0,
        source: "unavailable",
        discoveryMode: "unavailable",
        lastVerifiedAt: new Date().toISOString(),
        status: "error",
        error: `No discovery adapter for provider "${provider}"`,
      };
    }

    const isLocal = provider === "ollama" || provider === "lmstudio";

    try {
      // 1. Fetch raw models from live / local API
      const discoveredList = await adapter.listModels(config);
      const fetchedCount = discoveredList.length;

      // 2. Filter & Normalize (removing deprecated, shutdown, non-chat models)
      const validModels: NoskaModel[] = [];
      for (const item of discoveredList) {
        const normalized = this._enrichModel(provider, item, isLocal ? "local" : "live");
        if (normalized && normalized.status !== "shutdown" && normalized.status !== "deprecated") {
          validModels.push(normalized);
        }
      }
      const filteredCount = validModels.length;

      // 3. Rank models by Freshness + Relevance + Capabilities
      const rankedModels = this._rankModels(validModels);

      // 4. Update Cache with the COMPLETE valid catalog
      if (rankedModels.length > 0) {
        modelCatalogCache.set(provider, rankedModels);
      }

      const displayedCount = provider === "opencode_zen"
        ? rankedModels.length
        : Math.min(rankedModels.length, MAX_LATEST_MODELS);

      return {
        provider,
        models: rankedModels,
        fetchedCount,
        filteredCount,
        displayedCount,
        newestModel: rankedModels[0]?.displayName || rankedModels[0]?.apiModelId,
        source: isLocal ? "local" : "live",
        discoveryMode: isLocal ? "local" : "live",
        lastVerifiedAt: new Date().toISOString(),
        status: "online",
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);

      // Fallback to cache if live discovery failed (preserving complete catalog)
      const cached = modelCatalogCache.get(provider);
      if (cached && cached.models.length > 0) {
        const displayedCount = provider === "opencode_zen"
          ? cached.models.length
          : Math.min(cached.models.length, MAX_LATEST_MODELS);

        return {
          provider,
          models: cached.models,
          fetchedCount: 0,
          filteredCount: cached.models.length,
          displayedCount,
          newestModel: cached.newestModel,
          source: "cached",
          discoveryMode: "cached",
          lastVerifiedAt: new Date(cached.fetchedAt).toISOString(),
          status: isLocal ? "offline" : "online",
          error: `Live discovery unavailable: ${errMsg}. Using cached catalog.`,
        };
      }

      return {
        provider,
        models: [],
        fetchedCount: 0,
        filteredCount: 0,
        displayedCount: 0,
        source: "unavailable",
        discoveryMode: "unavailable",
        lastVerifiedAt: new Date().toISOString(),
        status: isLocal ? "offline" : (errMsg.includes("not configured") || errMsg.includes("required") ? "unconfigured" : "error"),
        error: errMsg,
      };
    }
  }

  /**
   * Enrich raw discovered model with override metadata, capabilities, and composite ID.
   * Public so sync can normalize already-fetched catalogs without a second network request.
   */
  public enrichModel(
    provider: ProviderId,
    item: DiscoveredModel,
    source: NoskaModel["source"] = "live"
  ): NoskaModel | null {
    return this._enrichModel(provider, item, source);
  }

  private _enrichModel(
    provider: ProviderId,
    item: DiscoveredModel,
    source: NoskaModel["source"]
  ): NoskaModel | null {
    const override = KNOWN_MODEL_OVERRIDES[item.apiModelId] || KNOWN_MODEL_OVERRIDES[`${provider}/${item.apiModelId}`];
    if (override?.status === "shutdown") return null;

    const capabilities = {
      ...inferModelCapabilities(item.apiModelId),
      ...(item.capabilities || {}),
      ...(override?.capabilities || {}),
    };

    const displayName = override?.displayName || item.displayName || formatDefaultDisplayName(item.apiModelId);
    const contextWindow = override?.contextWindow || item.contextWindow || 128000;
    const maxOutputTokens = override?.maxOutputTokens || item.maxOutputTokens || 8192;
    const status = override?.status || item.status || "available";

    // Composite ID: prefix with provider if not already present
    const id = item.apiModelId.includes("/") || provider === "openrouter"
      ? item.apiModelId
      : `${provider}/${item.apiModelId}`;

    const isLocal = provider === "ollama" || provider === "lmstudio";
    let freeAccess = item.freeAccess;
    if (!freeAccess) {
      if (isLocal) {
        freeAccess = {
          isFree: false,
          status: "local",
          source: "local",
          verifiedAt: new Date().toISOString(),
          conditions: ["Local Inference"],
        };
      } else if (item.pricing && item.pricing.inputPer1M === 0 && item.pricing.outputPer1M === 0) {
        freeAccess = {
          isFree: true,
          status: "free",
          source: "catalog",
          verifiedAt: new Date().toISOString(),
        };
      } else {
        freeAccess = {
          isFree: false,
          status: "paid",
          source: "provider",
          verifiedAt: new Date().toISOString(),
        };
      }
    }

    const pricing = override?.pricing || item.pricing;
    const aliases = override?.aliases || item.aliases;
    const knowledgeCutoff = override?.knowledgeCutoff || item.knowledgeCutoff;

    return {
      id,
      provider,
      displayName,
      apiModelId: item.apiModelId,
      family: override?.family || item.family,
      version: item.version,
      contextWindow,
      maxOutputTokens,
      knowledgeCutoff,
      capabilities,
      reasoningModes: override?.reasoningModes || item.reasoningModes,
      pricing,
      freeAccess,
      protocol: item.protocol,
      endpoint: item.endpoint,
      status,
      source,
      localState: item.localState,
      createdAt: item.createdAt ? String(item.createdAt) : undefined,
      lastVerifiedAt: item.lastVerifiedAt || new Date().toISOString(),
      aliases,
      description: item.description,
      enabled: true,
    };
  }

  /**
   * Rank models by:
   * 1. Freshness (creation timestamp or known release generation)
   * 2. Active availability & capability completeness (reasoning, vision, tools)
   * 3. Stable / flagship tier recognition
   */
  private _rankModels(models: NoskaModel[]): NoskaModel[] {
    return [...models].sort((a, b) => {
      const scoreA = this._calculateModelScore(a);
      const scoreB = this._calculateModelScore(b);
      return scoreB - scoreA;
    });
  }

  private _calculateModelScore(model: NoskaModel): number {
    let score = 50;

    const lowerId = model.apiModelId.toLowerCase();

    // 1. Freshness via timestamp if available (newest models rank top)
    if (model.createdAt) {
      const ts = Number(model.createdAt);
      if (!isNaN(ts) && ts > 0) {
        const ms = ts < 10000000000 ? ts * 1000 : ts;
        const ageDays = Math.max(0, (Date.now() - ms) / (1000 * 60 * 60 * 24));
        if (ageDays < 30) score += 40;
        else if (ageDays < 90) score += 30;
        else if (ageDays < 180) score += 20;
        else if (ageDays < 365) score += 10;
      }
    }

    // 2. Generic dynamic version extraction (e.g. v4, v3.7, 70B, etc.)
    const versionMatch = lowerId.match(/\bv?(\d+(?:\.\d+)?)\b/);
    if (versionMatch) {
      const ver = parseFloat(versionMatch[1]);
      if (!isNaN(ver) && ver > 0 && ver <= 20) {
        // Newer generation numbers receive scaled weight dynamically (e.g. v5, v4 > v3 > v2)
        score += Math.min(Math.round(ver * 6), 30);
      }
    }

    // 3. Stable root aliases preference (prefer official root aliases over dated snapshots)
    const isDatedSnapshot = /\b(20\d{2}[-_]?\d{2}[-_]?\d{2}|\d{8})\b/.test(lowerId);
    if (!isDatedSnapshot) {
      score += 15;
    } else {
      score -= 5;
    }

    // 4. Capability completeness
    if (model.capabilities.reasoning) score += 15;
    if (model.capabilities.vision) score += 10;
    if (model.capabilities.tools) score += 10;
    if (model.capabilities.structuredOutput) score += 5;

    // 5. Large context bonus
    if ((model.contextWindow || 0) >= 1000000) score += 15;
    else if ((model.contextWindow || 0) >= 128000) score += 10;

    // 6. Status weighting
    if (model.status === "available") score += 10;
    if (model.status === "preview") score += 5;

    return score;
  }
}

export const modelDiscoveryService = ModelDiscoveryService.getInstance();
