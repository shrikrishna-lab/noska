/**
 * In-memory static content cache with TTL, in-flight promise deduplication,
 * and resilient stale-while-revalidate fallback.
 * Strictly used for low-frequency public/static data (never for private user data).
 */

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}

const memoryStore = new Map<string, CacheEntry<unknown>>();
const inFlightPromises = new Map<string, Promise<unknown>>();

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS
): Promise<T> {
  const now = Date.now();
  const cached = memoryStore.get(key) as CacheEntry<T> | undefined;

  // Return fresh cache if within TTL
  if (cached && now - cached.cachedAt < ttlMs) {
    return cached.data;
  }

  // Deduplicate concurrent in-flight requests for the exact same key
  if (inFlightPromises.has(key)) {
    return inFlightPromises.get(key) as Promise<T>;
  }

  const promise = (async () => {
    try {
      const data = await fetcher();
      if (data !== undefined && data !== null) {
        memoryStore.set(key, { data, cachedAt: Date.now() });
      }
      return data;
    } catch (err) {
      // Graceful fallback to stale cache on network failure
      if (cached) {
        console.warn(`[staticContentCache] Network fetch failed for ${key}, using stale cache`, err);
        return cached.data;
      }
      throw err;
    } finally {
      inFlightPromises.delete(key);
    }
  })();

  inFlightPromises.set(key, promise);
  return promise;
}

export function invalidateStaticCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    memoryStore.clear();
    return;
  }
  for (const k of memoryStore.keys()) {
    if (k.startsWith(keyPrefix)) {
      memoryStore.delete(k);
    }
  }
}
