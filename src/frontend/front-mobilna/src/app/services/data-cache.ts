import { Injectable } from '@angular/core';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class DataCacheService {
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly ttlMs = 2 * 60 * 1000; // 2 minutes

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, { data, expiresAt: Date.now() + this.ttlMs });
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}
