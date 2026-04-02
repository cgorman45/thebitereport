/**
 * Simple in-memory cache for local development.
 *
 * Uses a plain Map so there are no external dependencies.  Each entry stores
 * the cached value alongside a Unix-ms expiry timestamp; stale entries are
 * evicted lazily on read.
 *
 * NOTE: This cache lives in Node process memory, so it is cleared on every
 * server restart and is NOT shared across multiple Next.js worker processes.
 * Replace with Redis / Upstash for production multi-instance deployments.
 */

interface CacheEntry<T> {
  value: T;
  /** Unix timestamp (ms) after which this entry is considered stale */
  expiresAt: number;
}

// Module-level singleton — persists for the lifetime of the Node process
const store = new Map<string, CacheEntry<unknown>>();

/**
 * Retrieves a cached value by key.
 *
 * @returns The stored value, or `null` if the key is absent or expired
 */
export function getCached<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;

  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    store.delete(key); // lazy eviction
    return null;
  }

  return entry.value;
}

/**
 * Stores a value in the cache under `key`.
 *
 * @param key        Cache key
 * @param value      Value to store (must be serialisable if you later swap to Redis)
 * @param ttlSeconds How many seconds the value should remain valid
 */
export function setCached<T>(
  key: string,
  value: T,
  ttlSeconds: number
): void {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Returns the number of entries currently held in the cache
 * (including expired ones that haven't been lazily evicted yet).
 * Useful for debugging / health-check endpoints.
 */
export function cacheSize(): number {
  return store.size;
}

/**
 * Removes all entries from the cache.
 * Useful in tests or when you want to force a full refresh.
 */
export function clearCache(): void {
  store.clear();
}

/**
 * Cache-aside helper.
 *
 * Checks the in-memory cache first.  On a miss, calls `fetcher()`, stores the
 * result, and returns it.  If `fetcher` resolves to `null` the result is NOT
 * cached (so the next request will retry the fetch).
 *
 * Usage:
 * ```ts
 * const tides = await withCache(
 *   `tides:${stationId}:${date}`,
 *   3600,
 *   () => getTidePredictions(stationId, date)
 * );
 * ```
 *
 * @param key        Unique cache key
 * @param ttlSeconds How long to cache a successful result
 * @param fetcher    Async function that fetches the data on cache miss
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = getCached<T>(key);
  if (cached !== null) return cached;

  const value = await fetcher();

  // Only cache non-null results so transient failures don't poison the cache
  if (value !== null && value !== undefined) {
    setCached(key, value, ttlSeconds);
  }

  return value;
}
