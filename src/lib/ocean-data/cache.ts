// src/lib/ocean-data/cache.ts

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export function get<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export function set<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiry: Date.now() + ttlMs });
}
