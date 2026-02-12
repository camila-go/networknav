/**
 * Simple in-memory cache with TTL (Time To Live)
 * 
 * For production, consider using Redis or a distributed cache.
 * This implementation is suitable for:
 * - Single-server deployments
 * - Caching data that's acceptable to be slightly stale
 * - Reducing database load for frequently accessed data
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // Default TTL: 5 minutes
  private defaultTtlMs = 5 * 60 * 1000;
  
  constructor() {
    // Start cleanup interval (runs every minute)
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
    }
  }
  
  /**
   * Get a value from cache
   * Returns undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      return undefined;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.data;
  }
  
  /**
   * Set a value in cache with optional TTL
   * @param key Cache key
   * @param data Data to cache
   * @param ttlMs Time to live in milliseconds (default: 5 minutes)
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTtlMs;
    const now = Date.now();
    
    this.cache.set(key, {
      data,
      createdAt: now,
      expiresAt: now + ttl,
    });
  }
  
  /**
   * Delete a specific key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache stats
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
  
  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }
  
  /**
   * Get or set pattern - fetches from source if not cached
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== undefined) {
      return cached;
    }
    
    const data = await fetcher();
    this.set(key, data, ttlMs);
    return data;
  }
  
  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Stop the cleanup interval (for graceful shutdown)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// ============================================
// Cache Instance & Exports
// ============================================

// Global cache instance
export const cache = new MemoryCache();

// ============================================
// Cache Keys
// ============================================

export const CACHE_KEYS = {
  FILTER_OPTIONS: 'filter_options',
  QUESTIONNAIRE_SECTIONS: 'questionnaire_sections',
  USER_PROFILE: (userId: string) => `user_profile:${userId}`,
  MATCHES: (userId: string) => `matches:${userId}`,
  NETWORK_DATA: (userId: string) => `network:${userId}`,
  CALENDAR_EVENTS: (userId: string, platform: string, timeMin: string, timeMax: string) =>
    `calendar_events:${userId}:${platform}:${timeMin}:${timeMax}`,
  CALENDAR_FREEBUSY: (userId: string, timeMin: string, timeMax: string) =>
    `calendar_freebusy:${userId}:${timeMin}:${timeMax}`,
} as const;

// ============================================
// Cache TTLs (in milliseconds)
// ============================================

export const CACHE_TTLS = {
  FILTER_OPTIONS: 30 * 60 * 1000, // 30 minutes - rarely changes
  QUESTIONNAIRE_SECTIONS: 60 * 60 * 1000, // 1 hour - static data
  USER_PROFILE: 5 * 60 * 1000, // 5 minutes - user data
  MATCHES: 10 * 60 * 1000, // 10 minutes - match data
  NETWORK_DATA: 10 * 60 * 1000, // 10 minutes - network graph
  CALENDAR_EVENTS: 3 * 60 * 1000, // 3 minutes - external calendar data
} as const;

/**
 * Invalidate cache for a specific user
 * Call this when user data changes
 */
export function invalidateUserCache(userId: string): void {
  cache.delete(CACHE_KEYS.USER_PROFILE(userId));
  cache.delete(CACHE_KEYS.MATCHES(userId));
  cache.delete(CACHE_KEYS.NETWORK_DATA(userId));
}

