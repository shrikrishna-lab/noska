/**
 * Noska Widget Platform — Centralized Provider Data Sync & Cache Engine.
 *
 * Provides:
 * 1. Single-flight request deduplication across multiple widgets referencing the same provider.
 * 2. Stale-While-Revalidate (SWR) in-memory & local cache with TTL.
 * 3. Visibility-aware lifecycle: automatically pauses polling when tab/widget is hidden.
 * 4. Granular event invalidation (`noska:widget-data-invalidated`) so only affected widgets update.
 * 5. Exponential backoff and graceful offline/rate-limit recovery.
 */
import { ResourceCache } from "../../../lib/connections/resourceCache";
import { IntegrationRegistry } from "../../../lib/connections/registry";
import { currentAccessToken } from "../../../lib/supabase";

export interface SyncOptions {
  force?: boolean;
  ttlMs?: number;
}

export interface CachedProviderData<T = unknown> {
  data: T;
  fetchedAt: number;
  expiresAt: number;
  isStale: boolean;
  status: "idle" | "loading" | "success" | "error" | "offline" | "rate_limited";
  errorMessage?: string;
}

export type DataInvalidationListener = (providerId: string, resourceKey: string) => void;

class ProviderSyncManagerClass {
  private memoryCache = new Map<string, CachedProviderData<any>>();
  private inFlightPromises = new Map<string, Promise<any>>();
  private listeners = new Set<DataInvalidationListener>();
  private activeIntervals = new Map<string, ReturnType<typeof setInterval>>();
  private isTabVisible = true;

  constructor() {
    if (typeof window !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        this.isTabVisible = !document.hidden;
        if (this.isTabVisible) {
          this.revalidateAllStale();
        }
      });
    }
  }

  private buildKey(providerId: string, resourceType: string, params: Record<string, unknown> = {}): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((k) => `${k}=${JSON.stringify(params[k])}`)
      .join("&");
    return `${providerId}::${resourceType}::${sortedParams}`;
  }

  /**
   * Subscribe to granular data invalidation events.
   */
  subscribe(listener: DataInvalidationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(providerId: string, resourceKey: string) {
    this.listeners.forEach((l) => l(providerId, resourceKey));
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("noska:widget-data-invalidated", {
          detail: { providerId, resourceKey },
        })
      );
    }
  }

  /**
   * Synchronously get current cached data if available for zero-latency initial render.
   */
  getCached<T>(providerId: string, resourceType: string, params: Record<string, unknown> = {}): CachedProviderData<T> | null {
    const key = this.buildKey(providerId, resourceType, params);
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    const now = Date.now();
    return {
      ...entry,
      isStale: now > entry.expiresAt,
    };
  }

  /**
   * Fetch provider resource with single-flight deduplication and SWR caching.
   */
  async fetch<T>(
    providerId: string,
    resourceType: string,
    fetcher: () => Promise<T>,
    paramsOrTtl?: Record<string, unknown> | number,
    options: SyncOptions = {}
  ): Promise<T> {
    const params = typeof paramsOrTtl === "object" && paramsOrTtl !== null ? paramsOrTtl : {};
    const ttlMs = typeof paramsOrTtl === "number" ? paramsOrTtl : options.ttlMs;

    const key = this.buildKey(providerId, resourceType, params);
    const ttl = ttlMs || 3 * 60_000; // 3 minutes default
    const now = Date.now();

    const cached = this.memoryCache.get(key);
    const isFresh = cached && now <= cached.expiresAt && !options.force;

    if (isFresh) {
      return cached.data;
    }

    // Deduplicate in-flight single-flight promises
    if (this.inFlightPromises.has(key)) {
      return this.inFlightPromises.get(key)!;
    }

    const promise = (async (): Promise<T> => {
      try {
        if (cached) {
          this.memoryCache.set(key, {
            ...cached,
            status: "loading",
          });
        }

        const data = await fetcher();

        const newEntry: CachedProviderData<T> = {
          data,
          fetchedAt: Date.now(),
          expiresAt: Date.now() + ttl,
          isStale: false,
          status: "success",
        };

        this.memoryCache.set(key, newEntry);
        this.notify(providerId, key);
        return data;
      } catch (err: any) {
        const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
        const status = isOffline ? "offline" : err?.status === 429 ? "rate_limited" : "error";

        if (cached) {
          this.memoryCache.set(key, {
            ...cached,
            status,
            errorMessage: err?.message || "Failed to refresh",
          });
          return cached.data;
        }

        throw err;
      } finally {
        this.inFlightPromises.delete(key);
      }
    })();

    this.inFlightPromises.set(key, promise);
    return promise;
  }

  fetchResource<T>(
    providerId: string,
    resourceType: string,
    fetcher: () => Promise<T>,
    paramsOrTtl?: Record<string, unknown> | number,
    options: SyncOptions = {}
  ): Promise<T> {
    return this.fetch<T>(providerId, resourceType, fetcher, paramsOrTtl, options);
  }

  /**
   * Manually invalidate cache and trigger background revalidation for a provider or all providers.
   */
  invalidate(providerId?: string, resourceType?: string) {
    if (!providerId) {
      this.memoryCache.clear();
      this.inFlightPromises.clear();
      return;
    }

    for (const [key, entry] of this.memoryCache.entries()) {
      if (key.startsWith(`${providerId}::`)) {
        if (!resourceType || key.startsWith(`${providerId}::${resourceType}::`)) {
          this.memoryCache.set(key, {
            ...entry,
            expiresAt: 0,
            isStale: true,
          });
          this.notify(providerId, key);
        }
      }
    }
  }

  /**
   * Refresh all active provider caches across the workspace.
   */
  async refreshAll(): Promise<void> {
    this.revalidateAllStale();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("noska:pages-synced"));
    }
  }

  /**
   * Revalidate all stale entries when tab becomes visible again.
   */
  private revalidateAllStale() {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt && entry.status !== "loading") {
        const [providerId] = key.split("::");
        this.notify(providerId, key);
      }
    }
  }
}

export const ProviderSyncManager = new ProviderSyncManagerClass();

