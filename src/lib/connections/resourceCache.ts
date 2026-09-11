/**
 * External Resource Cache with Stale-While-Revalidate (SWR)
 *
 * Provides sub-millisecond local reads for page renders, in-flight request
 * deduplication, TTL expiration (5m default), background revalidation, and
 * offline fallback.
 */

import { ExternalUrlResolver } from "./urlResolver";
import type { NormalizedResource, ResourceResolutionState, ResolveResourceResult } from "./types";
import { currentAccessToken, supabase } from "../supabase";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? "https://yxgtmzksnyarlivgxujf.supabase.co").replace(/\/$/, "");
const GATEWAY_RESOLVE_URL = `${SUPABASE_URL}/functions/v1/connector-gateway/resolve-url`;

const CACHE_TTL_MS = 5 * 60_000; // 5 minutes
const STORAGE_KEY_PREFIX = "noska:resource-cache:";

interface CacheEntry {
  result: ResolveResourceResult;
  fetchedAt: number;
  expiresAt: number;
}

export class ResourceCache {
  private static memoryCache = new Map<string, CacheEntry>();
  private static inFlight = new Map<string, Promise<ResolveResourceResult>>();
  private static subscribers = new Map<string, Set<(result: ResolveResourceResult) => void>>();

  private static cacheKey(url: string, accountId?: string): string {
    const canonical = ExternalUrlResolver.normalizeUrl(url);
    return accountId ? `${canonical}#account=${accountId}` : canonical;
  }

  private static readFromStorage(key: string): CacheEntry | null {
    try {
      if (typeof window === "undefined" || !window.localStorage) return null;
      const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private static writeToStorage(key: string, entry: CacheEntry): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(entry));
      }
    } catch {
      // Quota exceeded or private browsing
    }
  }

  /**
   * Synchronously get cached resource if available (for zero-latency initial render).
   */
  static getCached(url: string, accountId?: string): ResolveResourceResult | null {
    const key = this.cacheKey(url, accountId);
    let entry = this.memoryCache.get(key);
    if (!entry) {
      entry = this.readFromStorage(key) ?? undefined;
      if (entry) this.memoryCache.set(key, entry);
    }
    return entry ? entry.result : null;
  }

  /**
   * Resolve an external resource URL. Uses SWR strategy: returns cached data
   * immediately if present while refreshing in the background when stale.
   */
  static async resolve(
    rawUrl: string,
    options: { force?: boolean; accountId?: string } = {},
  ): Promise<ResolveResourceResult> {
    const key = this.cacheKey(rawUrl, options.accountId);
    const now = Date.now();

    const cached = this.getCached(rawUrl, options.accountId);
    const entry = this.memoryCache.get(key);

    const isStale = !entry || now > entry.expiresAt;

    // If we have a fresh cache entry and not forced, return immediately
    if (cached && !isStale && !options.force) {
      return cached;
    }

    // If an in-flight fetch is already happening for this exact resource, reuse the promise
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key)!;
    }

    // Trigger background or foreground fetch
    const fetchPromise = (async (): Promise<ResolveResourceResult> => {
      try {
        const token = await currentAccessToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(GATEWAY_RESOLVE_URL, {
          method: "POST",
          headers,
          body: JSON.stringify({
            url: rawUrl,
            account_id: options.accountId,
          }),
        });

        const data = (await res.json().catch(() => ({}))) as ResolveResourceResult;
        const result: ResolveResourceResult = {
          state: data.state || (res.ok ? "success" : "provider_unavailable"),
          resource: data.resource,
          errorMessage: data.errorMessage,
          accessibleAccounts: data.accessibleAccounts ?? [],
          selectedAccountId: data.selectedAccountId,
        };

        // Cache successful and known error states (except provider_unavailable which retries sooner)
        const ttl = result.state === "provider_unavailable" ? 30_000 : CACHE_TTL_MS;
        const newEntry: CacheEntry = {
          result,
          fetchedAt: now,
          expiresAt: now + ttl,
        };

        this.memoryCache.set(key, newEntry);
        this.writeToStorage(key, newEntry);
        this.notifySubscribers(key, result);

        return result;
      } catch (err) {
        // If network request failed but we had a cached copy, keep the cached resource with a notice
        if (cached?.resource) {
          const fallback: ResolveResourceResult = {
            ...cached,
            errorMessage: "Unable to refresh (network issue). Showing cached copy.",
          };
          return fallback;
        }

        const failureResult: ResolveResourceResult = {
          state: "provider_unavailable",
          errorMessage: err instanceof Error ? err.message : "Failed to connect to gateway.",
        };
        return failureResult;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, fetchPromise);

    // If we have stale cached data, return it immediately while fetchPromise finishes in background
    if (cached && !options.force) {
      return cached;
    }

    return fetchPromise;
  }

  static subscribe(url: string, callback: (result: ResolveResourceResult) => void, accountId?: string): () => void {
    const key = this.cacheKey(url, accountId);
    let subs = this.subscribers.get(key);
    if (!subs) {
      subs = new Set();
      this.subscribers.set(key, subs);
    }
    subs.add(callback);
    return () => {
      subs?.delete(callback);
      if (subs && subs.size === 0) {
        this.subscribers.delete(key);
      }
    };
  }

  private static notifySubscribers(key: string, result: ResolveResourceResult): void {
    const subs = this.subscribers.get(key);
    if (subs) {
      for (const cb of subs) {
        try { cb(result); } catch {}
      }
    }
  }

  static invalidate(url: string, accountId?: string): void {
    const key = this.cacheKey(url, accountId);
    this.memoryCache.delete(key);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem(STORAGE_KEY_PREFIX + key);
      }
    } catch {}
  }
}
