/**
 * Noska AI — Model Catalog Sync Service
 * 
 * Orchestrates on-demand synchronization of provider model catalogs with:
 * - In-flight deduplication locks (prevents concurrent duplicate requests)
 * - Non-destructive error recovery (preserves last-known-good cache on failure)
 * - Stale catalog detection
 * - STRICT RULE: Zero background interval / polling loops (No 2-minute polling)
 */

import { getProviderAdapter } from "./adapters";
import { ModelRepository, modelRepository } from "./ModelRepository";
import { registerDynamicProviderModels } from "../providers";
import { modelRegistry } from "./ModelRegistry";
import { inferModelCapabilities } from "./ModelMetadataOverrides";
import type {
  AIModelSyncRun,
  NormalizedModel,
  ProviderCredentials,
  SyncResult,
} from "./normalizedSchema";
import type { ModelLifecycleStatus, NoskaModel, ProviderId } from "./types";

const KNOWN_PROVIDER_IDS = new Set<string>([
  "openrouter", "gemini", "openai", "anthropic", "groq", "deepseek",
  "mistral", "together", "xai", "nvidia", "opencode_zen", "ollama", "lmstudio",
]);

const STATUS_TO_LIFECYCLE: Record<string, ModelLifecycleStatus> = {
  active: "available",
  preview: "preview",
  deprecated: "deprecated",
  unknown: "unknown",
};

function normalizedToNoskaModel(provider: string, m: NormalizedModel): NoskaModel {
  const pid = provider as ProviderId;
  const inferred = inferModelCapabilities(m.providerModelId);
  const caps = m.capabilities;
  return {
    id: `${pid}/${m.providerModelId}`,
    provider: pid,
    displayName: m.displayName || m.providerModelId,
    apiModelId: m.providerModelId,
    contextWindow: m.contextWindow || 128000,
    maxOutputTokens: m.maxOutputTokens || 8192,
    capabilities: {
      ...inferred,
      streaming: caps.streaming ?? inferred.streaming,
      reasoning: caps.reasoning ?? inferred.reasoning,
      tools: caps.toolCalling ?? inferred.tools,
      vision: caps.imageInput ?? inferred.vision,
      audio: caps.audioInput ?? inferred.audio,
      video: caps.videoInput ?? inferred.video,
      structuredOutput: caps.structuredOutput ?? inferred.structuredOutput,
    },
    pricing: m.pricing
      ? {
          inputPer1M: m.pricing.prompt,
          outputPer1M: m.pricing.completion,
          cachedInputPer1M: m.pricing.cachedPrompt,
          currency: m.pricing.currency,
        }
      : undefined,
    status: STATUS_TO_LIFECYCLE[m.status] ?? "unknown",
    source: "live",
    description: m.description,
    aliases: m.aliases,
    enabled: true,
    lastVerifiedAt: m.lastSyncedAt,
  };
}

export interface BatchSyncSummary {
  success: boolean;
  providersAttempted: number;
  providersSynced: number;
  modelsFoundTotal: number;
  modelsAddedTotal: number;
  modelsUpdatedTotal: number;
  syncedProviders: string[];
  errors: Array<{ provider: string; error: string }>;
  completedAt: string;
}

export const MODEL_CATALOG_STALE_AFTER = 12 * 60 * 60 * 1000; // 12 hours

export class ModelCatalogSyncService {
  private static _instance: ModelCatalogSyncService;

  private _repository: ModelRepository;
  // Map to deduplicate concurrent in-flight sync requests per provider/connection
  private _inFlightSyncs: Map<string, Promise<SyncResult>> = new Map();
  private _listeners: Array<() => void> = [];

  public static getInstance(): ModelCatalogSyncService {
    if (!ModelCatalogSyncService._instance) {
      ModelCatalogSyncService._instance = new ModelCatalogSyncService();
    }
    return ModelCatalogSyncService._instance;
  }

  constructor(repository: ModelRepository = modelRepository) {
    this._repository = repository;
    // Listen to repository changes
    this._repository.subscribe(() => this._notify());
  }

  public subscribe(cb: () => void): () => void {
    this._listeners.push(cb);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== cb);
    };
  }

  private _notify() {
    for (const l of this._listeners) {
      try {
        l();
      } catch (err) {
        console.error("ModelCatalogSyncService notification error:", err);
      }
    }
  }

  /**
   * Check if any synchronization is currently in progress
   */
  public isSyncingAny(): boolean {
    return this._inFlightSyncs.size > 0;
  }

  /**
   * Check if a synchronization is currently in progress for this provider/connection
   */
  public isSyncing(providerOrConnectionId: string): boolean {
    const key = (providerOrConnectionId || "").toLowerCase().trim();
    return this._inFlightSyncs.has(key);
  }

  /**
   * Check if the catalog for a given provider is considered stale (> 12 hours)
   */
  public isStale(providerOrConnectionId: string): boolean {
    return this._repository.isStale(providerOrConnectionId, MODEL_CATALOG_STALE_AFTER);
  }

  /**
   * Get the last successful sync timestamp for a provider/connection
   */
  public getLastSyncedAt(providerOrConnectionId: string): string | null {
    const models = this._repository.getModels(providerOrConnectionId);
    if (models.length === 0) return null;
    return models[0].lastSyncedAt || null;
  }

  /**
   * Get currently available models from the repository for a provider.
   * If empty and fallback provided, returns fallback without mutating cache.
   */
  public getModels(provider: string, fallbackModels: any[] = []): NormalizedModel[] {
    const key = (provider || "").toLowerCase().trim();
    const stored = this._repository.getModels(key);

    if (stored.length > 0) {
      // Filter out unavailable models for primary available display
      return stored.filter((m) => m.status !== "unavailable");
    }

    // Adapt fallback models if no snapshot exists yet
    return fallbackModels.map((m) => ({
      id: `${key}:${m.id}`,
      provider: key,
      providerModelId: m.id,
      displayName: m.name || m.id,
      description: m.description,
      type: "chat" as const,
      capabilities: {
        textInput: true,
        imageInput: Boolean(m.id.includes("vision") || m.id.includes("4o") || m.id.includes("gemini")),
        audioInput: false,
        videoInput: false,
        textOutput: true,
        imageOutput: false,
        audioOutput: false,
        videoOutput: false,
        reasoning: Boolean(m.id.includes("r1") || m.id.includes("o1") || m.id.includes("o3") || m.id.includes("3-7")),
        toolCalling: true,
        structuredOutput: true,
        streaming: true,
        embeddings: false,
      },
      contextWindow: m.context || 128000,
      status: "active" as const,
      lastSeenAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
    }));
  }

  /**
   * Perform an ON-DEMAND synchronization for a provider connection.
   * 
   * Strict rules:
   * 1. Deduplicates concurrent clicks/calls.
   * 2. Calls official adapter endpoint.
   * 3. Performs non-destructive diffing.
   * 4. Retains last-known-good data if network/auth fails.
   * 5. Never initiates automatic intervals.
   */
  public syncConnection(
    provider: string,
    credentials: ProviderCredentials = {},
    connectionId?: string,
    signal?: AbortSignal
  ): Promise<SyncResult> {
    const lockKey = (connectionId || provider).toLowerCase().trim();

    // 1. Concurrent sync protection: Reuse active promise if already running.
    // NOTE: this method is intentionally NOT async — the lock below must be
    // set synchronously in the same tick, otherwise concurrent callers issued
    // before the first await would each start their own upstream request.
    const inFlight = this._inFlightSyncs.get(lockKey);
    if (inFlight) {
      return inFlight;
    }

    const syncPromise = this._executeSync(lockKey, provider, credentials, connectionId, signal);
    this._inFlightSyncs.set(lockKey, syncPromise);
    return syncPromise;
  }

  /**
   * Runs the actual provider sync. Only invoked after the in-flight lock
   * has been registered in syncConnection; clears the lock on completion.
   */
  private async _executeSync(
    lockKey: string,
    provider: string,
    credentials: ProviderCredentials,
    connectionId?: string,
    signal?: AbortSignal
  ): Promise<SyncResult> {
      const startTime = Date.now();
      const runId = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      this._notify(); // update UI (button shows 'Syncing...')

      try {
        const adapter = getProviderAdapter(provider);
        if (!adapter) {
          throw new Error(`No discovery adapter registered for provider '${provider}'.`);
        }

        // Fetch live model catalog from official endpoint
        const liveModels = await adapter.listModels(credentials, signal);

        // Diff against previous stored snapshot
        const diff = this._repository.diffAndUpsert(
          connectionId || provider,
          provider,
          liveModels
        );

        // Dynamically register discovered models into active provider registry
        if (diff.models.length > 0) {
          const available = diff.models.filter((m) => m.status !== "unavailable");
          registerDynamicProviderModels(
            provider,
            available.map((m) => ({
              id: m.providerModelId,
              name: m.displayName || m.providerModelId,
              context: m.contextWindow || 128000,
              description: m.description,
            }))
          );
          // Bridge into ModelRegistry so the AI Workspace selector sees the
          // same catalog as Settings — offline apply (no second network fetch;
          // a refreshProvider here would double-hit the provider API and break
          // in-flight request dedup).
          if (KNOWN_PROVIDER_IDS.has(provider)) {
            const noskaModels = available.map((m) => normalizedToNoskaModel(provider, m));
            modelRegistry.applyDiscoveredModels(provider as ProviderId, noskaModels);
          }
        }

        const durationMs = Date.now() - startTime;
        const result: SyncResult = {
          success: true,
          provider,
          connectionId,
          modelsFound: diff.modelsFound,
          modelsAdded: diff.modelsAdded,
          modelsUpdated: diff.modelsUpdated,
          modelsUnavailable: diff.modelsUnavailable,
          syncedAt: new Date().toISOString(),
          durationMs,
          models: diff.models,
        };

        // Record successful run
        const syncRun: AIModelSyncRun = {
          id: runId,
          connectionId,
          provider,
          startedAt: new Date(startTime).toISOString(),
          completedAt: new Date().toISOString(),
          status: "success",
          modelsFound: diff.modelsFound,
          modelsAdded: diff.modelsAdded,
          modelsUpdated: diff.modelsUpdated,
          modelsUnavailable: diff.modelsUnavailable,
          durationMs,
        };
        this._repository.recordSyncRun(syncRun);

        return result;
      } catch (err: any) {
        const durationMs = Date.now() - startTime;
        let errorMessage = err?.message || "Failed to synchronize models with provider.";
        if (credentials.apiKey && credentials.apiKey.length > 4) {
          errorMessage = errorMessage.split(credentials.apiKey).join("[REDACTED_KEY]");
        }

        // Last-known-good cache survival: Do NOT delete existing data!
        const existingModels = this._repository.getLastKnownGoodModels(connectionId || provider);

        const syncRun: AIModelSyncRun = {
          id: runId,
          connectionId,
          provider,
          startedAt: new Date(startTime).toISOString(),
          completedAt: new Date().toISOString(),
          status: "failed",
          modelsFound: existingModels.length,
          modelsAdded: 0,
          modelsUpdated: 0,
          modelsUnavailable: 0,
          error: errorMessage,
          durationMs,
        };
        this._repository.recordSyncRun(syncRun);

        return {
          success: false,
          provider,
          connectionId,
          modelsFound: existingModels.length,
          modelsAdded: 0,
          modelsUpdated: 0,
          modelsUnavailable: 0,
          syncedAt: new Date().toISOString(),
          durationMs,
          error: errorMessage,
          models: existingModels,
          isCachedFallback: true,
        };
      } finally {
        this._inFlightSyncs.delete(lockKey);
        this._notify();
      }
  }

  /**
   * Synchronize all eligible / configured providers in parallel and register their models.
   */
  public async syncAllConfigured(
    providersConfig: Record<string, ProviderCredentials>,
    providerIdsToSync: string[]
  ): Promise<BatchSyncSummary> {
    const attempted: string[] = [];
    const errors: Array<{ provider: string; error: string }> = [];
    let syncedCount = 0;
    let totalFound = 0;
    let totalAdded = 0;
    let totalUpdated = 0;
    const syncedProviders: string[] = [];

    const tasks = providerIdsToSync.map(async (providerId) => {
      const creds = providersConfig[providerId] || {};
      attempted.push(providerId);
      try {
        const res = await this.syncConnection(providerId, creds);
        if (res.success) {
          syncedCount++;
          totalFound += res.modelsFound;
          totalAdded += res.modelsAdded;
          totalUpdated += res.modelsUpdated;
          syncedProviders.push(providerId);
        } else if (res.error) {
          errors.push({ provider: providerId, error: res.error });
        }
      } catch (err: any) {
        errors.push({ provider: providerId, error: err?.message || "Sync failed" });
      }
    });

    await Promise.allSettled(tasks);

    return {
      success: syncedCount > 0 || errors.length === 0,
      providersAttempted: attempted.length,
      providersSynced: syncedCount,
      modelsFoundTotal: totalFound,
      modelsAddedTotal: totalAdded,
      modelsUpdatedTotal: totalUpdated,
      syncedProviders,
      errors,
      completedAt: new Date().toISOString(),
    };
  }
}

export const modelCatalogSyncService = ModelCatalogSyncService.getInstance();
