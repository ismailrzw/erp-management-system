/**
 * In-memory client-side API response cache.
 * Provides instant 0ms responses for previously visited pages,
 * eliminating full-page loading flickers and reloads.
 */

const DEFAULT_TTL = 60 * 1000; // 60 seconds

class ApiCache {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Normalize and serialize URL + params into a unique cache key.
   */
  createKey(url, params = {}) {
    const cleanUrl = (url || '').trim().toLowerCase();
    // Exclude cache-busting or internal flags from key
    const cleanParams = { ...params };
    delete cleanParams._refresh;
    delete cleanParams._t;

    const keys = Object.keys(cleanParams).sort();
    const queryString = keys
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(cleanParams[k] ?? '')}`)
      .join('&');

    return queryString ? `${cleanUrl}?${queryString}` : cleanUrl;
  }

  /**
   * Retrieve cached item.
   * Returns { data, isStale } or null if not present.
   */
  get(url, params = {}) {
    const key = this.createKey(url, params);
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    const isStale = now > item.expiry;
    return { data: item.data, isStale, key };
  }

  /**
   * Store data in cache with TTL.
   */
  set(url, params = {}, data, ttl = DEFAULT_TTL) {
    if (data === undefined || data === null) return;
    const key = this.createKey(url, params);
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl,
      updatedAt: Date.now(),
    });
  }

  /**
   * Invalidate entries matching a key substring, regex, or specific resource prefix.
   */
  invalidate(pattern) {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    if (typeof pattern === 'string') {
      const lower = pattern.toLowerCase();
      for (const key of this.cache.keys()) {
        if (key.includes(lower)) {
          this.cache.delete(key);
        }
      }
    } else if (pattern instanceof RegExp) {
      for (const key of this.cache.keys()) {
        if (pattern.test(key)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Intelligently invalidate cache entries associated with a mutated endpoint.
   */
  invalidateForMutation(method, url) {
    const clean = (url || '').toLowerCase();

    // Invalidate broad resource family
    if (clean.includes('/groups') || clean.includes('/group')) {
      this.invalidate('/groups');
      this.invalidate('/group');
      this.invalidate('/dashboard');
      this.invalidate('/analytics');
    } else if (clean.includes('/student')) {
      this.invalidate('/student');
      this.invalidate('/groups');
      this.invalidate('/dashboard');
    } else if (clean.includes('/teacher')) {
      this.invalidate('/teacher');
      this.invalidate('/dashboard');
    } else if (clean.includes('/department')) {
      this.invalidate('/department');
      this.invalidate('/course');
    } else if (clean.includes('/course')) {
      this.invalidate('/course');
      this.invalidate('/department');
    } else if (clean.includes('/iteration')) {
      this.invalidate('/iteration');
      this.invalidate('/evaluation');
    } else if (clean.includes('/announcement')) {
      this.invalidate('/announcement');
      this.invalidate('/dashboard');
    } else if (clean.includes('/evaluator') || clean.includes('/supervisor')) {
      this.invalidate('/evaluator');
      this.invalidate('/supervisor');
      this.invalidate('/groups');
    } else {
      // Fallback: invalidate any key that contains the first 2 URL segments
      const segments = clean.split('/').filter(Boolean).slice(0, 2);
      if (segments.length > 0) {
        this.invalidate(segments.join('/'));
      }
    }
  }

  /**
   * Clear all cached data (e.g. on logout).
   */
  clear() {
    this.cache.clear();
  }
}

export const apiCache = new ApiCache();
