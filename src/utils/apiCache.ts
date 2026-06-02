export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

export const CACHE_TTL = {
  DEFAULT: 5 * 60 * 1000,
  HOME_FRAME: 8 * 60 * 60 * 1000,
  DETAILS: 8 * 60 * 60 * 1000,
  TOP_COMMENTS: 5 * 60 * 1000,
  RECENT_COMMENTS: 2 * 60 * 1000,
  PUBLIC_ROOMS: 30 * 1000,
};

function stableStringify(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
    .join(',')}}`;
}

export function buildApiCacheKey(prefix: string, key: string, params?: unknown) {
  return params === undefined
    ? `${prefix}:${key}`
    : `${prefix}:${key}:${stableStringify(params)}`;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private pending = new Map<string, Promise<unknown>>();

  set<T>(key: string, data: T, ttl: number = CACHE_TTL.DEFAULT): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl: number = CACHE_TTL.DEFAULT): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const pendingRequest = this.pending.get(key);
    if (pendingRequest) return pendingRequest as Promise<T>;

    const request = fetcher()
      .then((data) => {
        this.set(key, data, ttl);
        return data;
      })
      .finally(() => {
        this.pending.delete(key);
      });

    this.pending.set(key, request);
    return request;
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.pending.delete(key);
  }

  clearByPrefix(prefix: string): void {
    Array.from(this.cache.keys()).forEach((key) => {
      if (key.startsWith(prefix)) this.cache.delete(key);
    });
    Array.from(this.pending.keys()).forEach((key) => {
      if (key.startsWith(prefix)) this.pending.delete(key);
    });
  }

  clear(): void {
    this.cache.clear();
    this.pending.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

const apiCache = new ApiCache();

export default apiCache;
