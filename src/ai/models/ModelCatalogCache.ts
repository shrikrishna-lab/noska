/**
 * Noska AI — Model Catalog Cache
 * 
 * Persistent local cache for dynamic provider model catalogs with TTL and fallback support.
 */

import type { NoskaModel, ProviderId } from './types';

export interface CachedProviderCatalog {
  provider: ProviderId;
  models: NoskaModel[];
  fetchedAt: number;
  expiresAt: number;
  newestModel?: string;
}

const STORAGE_PREFIX = "noska_catalog_cache_";
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 2; // 2 hours

export class ModelCatalogCache {
  private static _instance: ModelCatalogCache;
  private _memoryCache = new Map<ProviderId, CachedProviderCatalog>();

  public static getInstance(): ModelCatalogCache {
    if (!ModelCatalogCache._instance) {
      ModelCatalogCache._instance = new ModelCatalogCache();
    }
    return ModelCatalogCache._instance;
  }

  constructor() {
    this._loadAllFromStorage();
  }

  public get(provider: ProviderId): CachedProviderCatalog | null {
    const mem = this._memoryCache.get(provider);
    if (mem) return mem;

    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${provider}`);
      if (raw) {
        const parsed: CachedProviderCatalog = JSON.parse(raw);
        this._memoryCache.set(provider, parsed);
        return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  }

  public set(provider: ProviderId, models: NoskaModel[], ttlMs = DEFAULT_TTL_MS): void {
    const now = Date.now();
    const newestModel = models[0]?.displayName || models[0]?.apiModelId;
    const entry: CachedProviderCatalog = {
      provider,
      models: models.map(m => ({ ...m, source: "cached" })),
      fetchedAt: now,
      expiresAt: now + ttlMs,
      newestModel
    };

    this._memoryCache.set(provider, entry);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${provider}`, JSON.stringify(entry));
      } catch {
        // quota exceeded or storage blocked
      }
    }
  }

  public isExpired(provider: ProviderId): boolean {
    const entry = this.get(provider);
    if (!entry) return true;
    return Date.now() > entry.expiresAt;
  }

  public clear(provider?: ProviderId): void {
    if (provider) {
      this._memoryCache.delete(provider);
      try {
        if (typeof window !== "undefined" && typeof localStorage !== "undefined" && localStorage) {
          localStorage.removeItem(`${STORAGE_PREFIX}${provider}`);
        }
      } catch {
        // ignore
      }
    } else {
      this._memoryCache.clear();
      try {
        if (typeof window !== "undefined" && typeof localStorage !== "undefined" && localStorage) {
          const keys: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
          }
          for (const k of keys) localStorage.removeItem(k);
        }
      } catch {
        // ignore
      }
    }
  }

  private _loadAllFromStorage(): void {
    try {
      if (typeof window === "undefined" || typeof localStorage === "undefined" || !localStorage) return;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const entry: CachedProviderCatalog = JSON.parse(raw);
            this._memoryCache.set(entry.provider, entry);
          }
        }
      }
    } catch {
      // ignore
    }
  }
}

export const modelCatalogCache = ModelCatalogCache.getInstance();
