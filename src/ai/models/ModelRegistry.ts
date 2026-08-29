/**
 * Noska AI — Unified Dynamic Model Registry
 * 
 * The SINGLE SOURCE OF TRUTH for model availability, capabilities, context limits,
 * and live counts across all 12 providers.
 * 
 * Replaces all duplicate registries (DEFAULT_AI_MODELS, getRealAiModels(), hardcoded lists).
 */

import type { NoskaModel, ProviderDiscoveryResult, ProviderId } from './types';
import { modelDiscoveryService, MAX_MODELS_PER_PROVIDER } from './ModelDiscoveryService';
import { modelCatalogCache } from './ModelCatalogCache';

export class ModelRegistry {
  private static _instance: ModelRegistry;
  private _providerModels = new Map<ProviderId, NoskaModel[]>();
  private _diagnostics = new Map<ProviderId, ProviderDiscoveryResult>();
  private _listeners = new Set<() => void>();
  private _isRefreshing = false;
  private _initialized = false;

  public static getInstance(): ModelRegistry {
    if (!ModelRegistry._instance) {
      ModelRegistry._instance = new ModelRegistry();
    }
    return ModelRegistry._instance;
  }

  constructor() {
    this._loadInitialCache();
  }

  private _loadInitialCache(): void {
    const providers: ProviderId[] = [
      "openrouter", "gemini", "openai", "anthropic", "groq", "deepseek",
      "mistral", "together", "xai", "nvidia", "opencode_zen", "ollama", "lmstudio"
    ];
    for (const p of providers) {
      const cached = modelCatalogCache.get(p);
      if (cached && cached.models.length > 0) {
        this._providerModels.set(p, cached.models);
      }
    }
  }

  public subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private _notify(): void {
    for (const fn of this._listeners) {
      try { fn(); } catch { /* ignore */ }
    }
  }

  /**
   * Get all active models across all providers (complete catalog)
   */
  public getAllModels(): NoskaModel[] {
    const all: NoskaModel[] = [];
    for (const list of this._providerModels.values()) {
      all.push(...list);
    }
    return all;
  }

  /**
   * Get discovered models for a specific provider (complete catalog)
   */
  public getModelsForProvider(providerId: ProviderId): NoskaModel[] {
    return this._providerModels.get(providerId) || [];
  }

  /**
   * Get latest up to 10 models for a provider (all for OpenCode Zen)
   */
  public getLatestModelsForProvider(providerId: ProviderId, max: number = 10): NoskaModel[] {
    const list = this.getModelsForProvider(providerId).filter(m => m.status !== "shutdown" && m.status !== "deprecated");
    if (providerId === "opencode_zen") return list;
    return list.slice(0, max);
  }

  /**
   * Get dynamically calculated model count for a provider.
   * Replaces all hardcoded counts.
   */
  public getProviderModelCount(providerId: ProviderId): number {
    return (this._providerModels.get(providerId) || []).length;
  }

  /**
   * Find a specific model by composite ID or raw API model ID
   */
  public getModel(modelId: string | null | undefined): NoskaModel | null {
    if (!modelId) return null;
    const cleanId = modelId.trim();

    // 1. Direct ID match
    for (const list of this._providerModels.values()) {
      const found = list.find(m => m.id === cleanId || m.apiModelId === cleanId);
      if (found) return found;
    }

    // 2. Case-insensitive search
    const lower = cleanId.toLowerCase();
    for (const list of this._providerModels.values()) {
      const found = list.find(m => m.id.toLowerCase() === lower || m.apiModelId.toLowerCase() === lower);
      if (found) return found;
    }

    return null;
  }

  /**
   * Validate if a model is available on a provider.
   * If unavailable, returns recommended active fallback.
   */
  public validateModel(modelId: string, providerId: ProviderId): {
    valid: boolean;
    resolvedModelId: string;
    warning?: string;
  } {
    const list = this.getModelsForProvider(providerId);
    if (list.length === 0) {
      return { valid: true, resolvedModelId: modelId }; // allow during discovery
    }

    const match = list.find(m => m.id === modelId || m.apiModelId === modelId);
    if (match && match.status !== "shutdown" && match.status !== "deprecated") {
      return { valid: true, resolvedModelId: match.apiModelId };
    }

    // Fallback to top ranked active model for this provider
    const fallback = list[0];
    return {
      valid: false,
      resolvedModelId: fallback ? fallback.apiModelId : modelId,
      warning: `Model "${modelId}" is not in ${providerId}'s active catalog. Using "${fallback?.displayName || fallback?.apiModelId}".`
    };
  }

  /**
   * Filter models by functional category or model family
   */
  public getCategorizedModels(
    category: "all" | "free" | "local" | "latest" | "recommended" | "reasoning" | "coding" | "fast" | "vision" | "gpt" | "claude" | "gemini" | "grok" | "qwen" | "deepseek" | "minimax" | "glm" | "kimi" | "muse" | "nemotron",
    providerFilter?: ProviderId
  ): NoskaModel[] {
    const all = providerFilter ? this.getModelsForProvider(providerFilter) : this.getAllModels();
    const limit = (category === "all" || providerFilter === "opencode_zen") ? all.length : 10;

    switch (category) {
      case "all":
        return all.slice(0, limit);

      case "free":
        return all.filter(m => m.freeAccess?.isFree && m.status !== "shutdown").slice(0, limit);

      case "local":
        return all.filter(m => (m.source === "local" || m.localState?.available || m.provider === "ollama" || m.provider === "lmstudio") && m.status !== "shutdown").slice(0, limit);

      case "latest":
        return [...all].sort((a, b) => {
          const tsA = Number(a.createdAt) || 0;
          const tsB = Number(b.createdAt) || 0;
          return tsB - tsA;
        }).slice(0, limit);

      case "recommended": {
        const topPerProvider: NoskaModel[] = [];
        const seenProviders = new Set<string>();
        for (const m of all) {
          if (!seenProviders.has(m.provider) && m.status === "available") {
            seenProviders.add(m.provider);
            topPerProvider.push(m);
          }
        }
        return topPerProvider.slice(0, limit);
      }

      case "reasoning":
        return all.filter(m => m.capabilities.reasoning && m.status !== "shutdown").slice(0, limit);

      case "coding":
        return all.filter(m => (m.capabilities.tools || m.capabilities.structuredOutput || m.capabilities.reasoning) && m.status !== "shutdown").slice(0, limit);

      case "fast":
        return all.filter(m => !m.capabilities.reasoning && m.capabilities.streaming && m.status !== "shutdown").slice(0, limit);

      case "vision":
        return all.filter(m => m.capabilities.vision && m.status !== "shutdown").slice(0, limit);

      case "gpt":
      case "claude":
      case "gemini":
      case "grok":
      case "qwen":
      case "deepseek":
      case "minimax":
      case "glm":
      case "kimi":
      case "muse":
      case "nemotron":
        return all.filter(m => (m.family === category || m.apiModelId.toLowerCase().startsWith(`${category}-`) || m.apiModelId.toLowerCase().includes(category)) && m.status !== "shutdown").slice(0, limit);

      default:
        return all.slice(0, limit);
    }
  }

  /**
   * Search models by keyword, family, or feature
   */
  public searchModels(query: string, providerFilter?: ProviderId): NoskaModel[] {
    const clean = query.trim().toLowerCase();
    if (!clean) return this.getCategorizedModels("all", providerFilter);

    const source = providerFilter ? this.getModelsForProvider(providerFilter) : this.getAllModels();
    return source.filter(m =>
      m.displayName.toLowerCase().includes(clean) ||
      m.apiModelId.toLowerCase().includes(clean) ||
      (m.family && m.family.toLowerCase().includes(clean)) ||
      (clean === "free" && m.freeAccess?.isFree) ||
      (clean === "local" && (m.source === "local" || m.localState?.available)) ||
      (clean === "reasoning" && m.capabilities.reasoning) ||
      (clean === "vision" && m.capabilities.vision)
    );
  }

  /**
   * Live refresh for a single provider
   */
  public async refreshProvider(
    providerId: ProviderId,
    config?: { apiKey?: string; baseUrl?: string; signal?: AbortSignal }
  ): Promise<ProviderDiscoveryResult> {
    const result = await modelDiscoveryService.discoverForProvider(providerId, config);
    if (result.models.length > 0) {
      this._providerModels.set(providerId, result.models);
    }
    this._diagnostics.set(providerId, result);
    this._notify();
    return result;
  }

  /**
   * Refresh all providers using supplied config map
   */
  public async refreshAll(
    providersConfig: Partial<Record<ProviderId, { apiKey?: string; baseUrl?: string }>> = {},
    signal?: AbortSignal
  ): Promise<Record<ProviderId, ProviderDiscoveryResult>> {
    if (this._isRefreshing) return this.getAllDiagnostics();
    this._isRefreshing = true;

    const providers: ProviderId[] = [
      "openrouter", "gemini", "openai", "anthropic", "groq", "deepseek",
      "mistral", "together", "xai", "nvidia", "opencode_zen", "ollama", "lmstudio"
    ];

    const results = {} as Record<ProviderId, ProviderDiscoveryResult>;

    await Promise.allSettled(
      providers.map(async (p) => {
        const cfg = providersConfig[p] || {};
        const res = await modelDiscoveryService.discoverForProvider(p, { ...cfg, signal });
        if (res.models.length > 0) {
          this._providerModels.set(p, res.models);
        }
        this._diagnostics.set(p, res);
        results[p] = res;
      })
    );

    this._isRefreshing = false;
    this._initialized = true;
    this._notify();
    return results;
  }

  /**
   * Get diagnostics telemetry for all 12 providers
   */
  public getAllDiagnostics(): Record<ProviderId, ProviderDiscoveryResult> {
    const diag = {} as Record<ProviderId, ProviderDiscoveryResult>;
    for (const [p, res] of this._diagnostics.entries()) {
      diag[p] = res;
    }
    return diag;
  }
}

export const modelRegistry = ModelRegistry.getInstance();
