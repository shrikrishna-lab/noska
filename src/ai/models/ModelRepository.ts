/**
 * Noska AI — Model Repository & Persistence
 * 
 * Handles snapshot storage, non-destructive diffing, last-known-good fallback,
 * stale detection, and sync history runs.
 */

import type {
  AIConnection,
  AIModelEntity,
  AIModelSyncRun,
  NormalizedModel,
} from "./normalizedSchema";

const STORAGE_KEYS = {
  CONNECTIONS: "noska_ai_connections",
  MODELS: "noska_ai_models_snapshots",
  SYNC_RUNS: "noska_ai_sync_runs",
};

export interface DiffResult {
  modelsFound: number;
  modelsAdded: number;
  modelsUpdated: number;
  modelsUnavailable: number;
  models: NormalizedModel[];
}

export class ModelRepository {
  private static _instance: ModelRepository;

  // In-memory cache for ultra-fast access without disk latency
  private _connectionsCache: Map<string, AIConnection> = new Map();
  private _modelsCache: Map<string, NormalizedModel[]> = new Map(); // key: connectionId or provider
  private _syncRunsCache: AIModelSyncRun[] = [];
  private _subscribers: Array<() => void> = [];

  public static getInstance(): ModelRepository {
    if (!ModelRepository._instance) {
      ModelRepository._instance = new ModelRepository();
    }
    return ModelRepository._instance;
  }

  constructor() {
    this._loadFromStorage();
  }

  public subscribe(callback: () => void): () => void {
    this._subscribers.push(callback);
    return () => {
      this._subscribers = this._subscribers.filter((s) => s !== callback);
    };
  }

  private _notify() {
    for (const sub of this._subscribers) {
      try {
        sub();
      } catch (err) {
        console.error("ModelRepository subscription error:", err);
      }
    }
  }

  private _loadFromStorage(): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      // 1. Load Connections
      const rawConnections = localStorage.getItem(STORAGE_KEYS.CONNECTIONS);
      if (rawConnections) {
        const parsed = JSON.parse(rawConnections) as AIConnection[];
        if (Array.isArray(parsed)) {
          for (const c of parsed) {
            this._connectionsCache.set(c.id, c);
            if (c.provider) this._connectionsCache.set(c.provider, c);
          }
        }
      }

      // 2. Load Models Snapshots
      const rawModels = localStorage.getItem(STORAGE_KEYS.MODELS);
      if (rawModels) {
        const parsed = JSON.parse(rawModels) as Record<string, NormalizedModel[]>;
        if (parsed && typeof parsed === "object") {
          for (const [key, list] of Object.entries(parsed)) {
            if (Array.isArray(list)) {
              this._modelsCache.set(key, list);
            }
          }
        }
      }

      // 3. Load Sync Runs
      const rawRuns = localStorage.getItem(STORAGE_KEYS.SYNC_RUNS);
      if (rawRuns) {
        const parsed = JSON.parse(rawRuns) as AIModelSyncRun[];
        if (Array.isArray(parsed)) {
          this._syncRunsCache = parsed.slice(-50); // retain last 50 runs
        }
      }
    } catch (err) {
      console.warn("Could not load ModelRepository storage cache:", err);
    }
  }

  private _persist(): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      // 1. Persist Connections
      const connList = Array.from(new Set(this._connectionsCache.values()));
      localStorage.setItem(STORAGE_KEYS.CONNECTIONS, JSON.stringify(connList));

      // 2. Persist Models
      const modelsObj: Record<string, NormalizedModel[]> = {};
      for (const [key, list] of this._modelsCache.entries()) {
        modelsObj[key] = list;
      }
      localStorage.setItem(STORAGE_KEYS.MODELS, JSON.stringify(modelsObj));

      // 3. Persist Sync Runs
      localStorage.setItem(STORAGE_KEYS.SYNC_RUNS, JSON.stringify(this._syncRunsCache.slice(-50)));
    } catch (err) {
      console.warn("Could not persist ModelRepository storage cache:", err);
    }
    this._notify();
  }

  // ─── Connection Management ────────────────────────────────────────────────

  public getConnection(connectionIdOrProvider: string): AIConnection | null {
    const key = (connectionIdOrProvider || "").toLowerCase().trim();
    return this._connectionsCache.get(key) || null;
  }

  public saveConnection(connection: AIConnection): void {
    this._connectionsCache.set(connection.id, connection);
    if (connection.provider) {
      this._connectionsCache.set(connection.provider.toLowerCase(), connection);
    }
    this._persist();
  }

  // ─── Models & Snapshots ───────────────────────────────────────────────────

  public getModels(connectionIdOrProvider: string): NormalizedModel[] {
    const key = (connectionIdOrProvider || "").toLowerCase().trim();
    return this._modelsCache.get(key) || [];
  }

  public getLastKnownGoodModels(connectionIdOrProvider: string): NormalizedModel[] {
    return this.getModels(connectionIdOrProvider);
  }

  public isStale(connectionIdOrProvider: string, staleThresholdMs = 12 * 60 * 60 * 1000): boolean {
    const models = this.getModels(connectionIdOrProvider);
    if (models.length === 0) return true;

    const latestSync = models.reduce((latest, m) => {
      const ts = m.lastSyncedAt ? new Date(m.lastSyncedAt).getTime() : 0;
      return ts > latest ? ts : latest;
    }, 0);

    if (latestSync === 0) return true;
    return Date.now() - latestSync > staleThresholdMs;
  }

  /**
   * Non-destructive Diffing and Snapshot Upsert:
   * - Identifies newly discovered models (added)
   * - Updates changed models (updated)
   * - Marks disappeared models as 'unavailable' instead of deleting them (history preserved)
   */
  public diffAndUpsert(
    connectionIdOrProvider: string,
    provider: string,
    incomingModels: NormalizedModel[]
  ): DiffResult {
    const key = (connectionIdOrProvider || provider).toLowerCase().trim();
    const existing = this._modelsCache.get(key) || [];
    const existingMap = new Map<string, NormalizedModel>();

    for (const m of existing) {
      existingMap.set(m.providerModelId, m);
    }

    const incomingMap = new Map<string, NormalizedModel>();
    let modelsAdded = 0;
    let modelsUpdated = 0;
    let modelsUnavailable = 0;

    const now = new Date().toISOString();
    const resultList: NormalizedModel[] = [];

    // 1. Process incoming models (new or updated)
    for (const incoming of incomingModels) {
      incomingMap.set(incoming.providerModelId, incoming);
      const prev = existingMap.get(incoming.providerModelId);

      if (!prev) {
        // Newly discovered model
        modelsAdded++;
        resultList.push({
          ...incoming,
          status: incoming.status === "unavailable" ? "active" : incoming.status,
          lastSeenAt: now,
          lastSyncedAt: now,
        });
      } else {
        // Existing model - check if updated
        const isChanged =
          prev.displayName !== incoming.displayName ||
          prev.contextWindow !== incoming.contextWindow ||
          prev.status !== incoming.status ||
          prev.maxOutputTokens !== incoming.maxOutputTokens;

        if (isChanged || prev.status === "unavailable") {
          modelsUpdated++;
        }

        resultList.push({
          ...prev,
          ...incoming,
          // If it was previously marked unavailable, reactivate it
          status: incoming.status !== "unavailable" ? incoming.status : "active",
          lastSeenAt: now,
          lastSyncedAt: now,
        });
      }
    }

    // 2. Process models in previous snapshot that are missing from current response
    for (const [modelId, prevModel] of existingMap.entries()) {
      if (!incomingMap.has(modelId)) {
        modelsUnavailable++;
        // Preserve model but mark as unavailable
        resultList.push({
          ...prevModel,
          status: "unavailable",
          lastSyncedAt: now,
        });
      }
    }

    // Save snapshot
    this._modelsCache.set(key, resultList);
    if (provider && provider.toLowerCase() !== key) {
      this._modelsCache.set(provider.toLowerCase(), resultList);
    }

    // Update connection metadata if present
    const conn = this._connectionsCache.get(key) || this._connectionsCache.get(provider.toLowerCase());
    if (conn) {
      conn.lastSyncedAt = now;
      conn.status = "active";
      conn.updatedAt = now;
      this._connectionsCache.set(conn.id, conn);
    }

    this._persist();

    return {
      modelsFound: incomingModels.length,
      modelsAdded,
      modelsUpdated,
      modelsUnavailable,
      models: resultList,
    };
  }

  // ─── Sync Runs History ────────────────────────────────────────────────────

  public recordSyncRun(run: AIModelSyncRun): void {
    this._syncRunsCache.push(run);
    this._persist();
  }

  public getSyncHistory(connectionIdOrProvider?: string): AIModelSyncRun[] {
    if (!connectionIdOrProvider) return [...this._syncRunsCache];
    const key = connectionIdOrProvider.toLowerCase().trim();
    return this._syncRunsCache.filter(
      (r) => r.connectionId?.toLowerCase() === key || r.provider?.toLowerCase() === key
    );
  }
}

export const modelRepository = ModelRepository.getInstance();
