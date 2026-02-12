/** @vitest-environment node */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// We need a fresh MemoryCache for each test, so we import the module dynamically
// The exported `cache` is a singleton, but we can test it after clearing

describe("MemoryCache", () => {
  let cache: typeof import("./cache").cache;
  let CACHE_KEYS: typeof import("./cache").CACHE_KEYS;
  let CACHE_TTLS: typeof import("./cache").CACHE_TTLS;
  let invalidateUserCache: typeof import("./cache").invalidateUserCache;

  beforeEach(async () => {
    vi.useFakeTimers();
    const mod = await import("./cache");
    cache = mod.cache;
    CACHE_KEYS = mod.CACHE_KEYS;
    CACHE_TTLS = mod.CACHE_TTLS;
    invalidateUserCache = mod.invalidateUserCache;
    cache.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("get/set", () => {
    it("should store and retrieve a value", () => {
      cache.set("key1", "value1");
      expect(cache.get("key1")).toBe("value1");
    });

    it("should return undefined for non-existent key", () => {
      expect(cache.get("nonexistent")).toBeUndefined();
    });

    it("should return undefined for expired entry", () => {
      cache.set("key1", "value1", 1000); // 1 second TTL
      vi.advanceTimersByTime(1500); // advance past TTL
      expect(cache.get("key1")).toBeUndefined();
    });

    it("should support custom TTL per entry", () => {
      cache.set("short", "val", 500);
      cache.set("long", "val", 5000);
      vi.advanceTimersByTime(1000);
      expect(cache.get("short")).toBeUndefined();
      expect(cache.get("long")).toBe("val");
    });

    it("should use default 5-minute TTL when none specified", () => {
      cache.set("key1", "value1");
      vi.advanceTimersByTime(4 * 60 * 1000); // 4 minutes
      expect(cache.get("key1")).toBe("value1");
      vi.advanceTimersByTime(2 * 60 * 1000); // 6 minutes total
      expect(cache.get("key1")).toBeUndefined();
    });

    it("should overwrite existing entry with same key", () => {
      cache.set("key1", "original");
      cache.set("key1", "updated");
      expect(cache.get("key1")).toBe("updated");
    });

    it("should store and retrieve complex objects", () => {
      const obj = { name: "test", nested: { arr: [1, 2, 3] } };
      cache.set("obj", obj);
      expect(cache.get("obj")).toEqual(obj);
    });
  });

  describe("has", () => {
    it("should return true for existing non-expired key", () => {
      cache.set("key1", "value1");
      expect(cache.has("key1")).toBe(true);
    });

    it("should return false for non-existent key", () => {
      expect(cache.has("nonexistent")).toBe(false);
    });

    it("should return false for expired key", () => {
      cache.set("key1", "value1", 500);
      vi.advanceTimersByTime(1000);
      expect(cache.has("key1")).toBe(false);
    });
  });

  describe("delete", () => {
    it("should remove a specific key", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.delete("key1");
      expect(cache.get("key1")).toBeUndefined();
      expect(cache.get("key2")).toBe("value2");
    });

    it("should return false for non-existent key", () => {
      expect(cache.delete("nonexistent")).toBe(false);
    });
  });

  describe("clear", () => {
    it("should remove all entries", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.clear();
      expect(cache.get("key1")).toBeUndefined();
      expect(cache.get("key2")).toBeUndefined();
      expect(cache.stats().size).toBe(0);
    });
  });

  describe("stats", () => {
    it("should return size and keys of cache", () => {
      cache.set("alpha", 1);
      cache.set("beta", 2);
      cache.set("gamma", 3);
      const stats = cache.stats();
      expect(stats.size).toBe(3);
      expect(stats.keys).toContain("alpha");
      expect(stats.keys).toContain("beta");
      expect(stats.keys).toContain("gamma");
    });

    it("should return empty stats for empty cache", () => {
      const stats = cache.stats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });
  });

  describe("getOrSet", () => {
    it("should return cached value when key exists", async () => {
      cache.set("key1", "cached");
      const fetcher = vi.fn().mockResolvedValue("fresh");
      const result = await cache.getOrSet("key1", fetcher);
      expect(result).toBe("cached");
      expect(fetcher).not.toHaveBeenCalled();
    });

    it("should call fetcher and cache result when key missing", async () => {
      const fetcher = vi.fn().mockResolvedValue("fresh");
      const result = await cache.getOrSet("key1", fetcher);
      expect(result).toBe("fresh");
      expect(fetcher).toHaveBeenCalledOnce();
      expect(cache.get("key1")).toBe("fresh");
    });

    it("should respect custom TTL for fetched values", async () => {
      const fetcher = vi.fn().mockResolvedValue("fresh");
      await cache.getOrSet("key1", fetcher, 1000);
      expect(cache.get("key1")).toBe("fresh");
      vi.advanceTimersByTime(1500);
      expect(cache.get("key1")).toBeUndefined();
    });
  });

  describe("CACHE_KEYS", () => {
    it("should generate correct user-scoped cache keys", () => {
      expect(CACHE_KEYS.USER_PROFILE("user-1")).toBe("user_profile:user-1");
      expect(CACHE_KEYS.MATCHES("user-1")).toBe("matches:user-1");
      expect(CACHE_KEYS.NETWORK_DATA("user-1")).toBe("network:user-1");
    });

    it("should generate correct calendar cache keys", () => {
      const key = CACHE_KEYS.CALENDAR_EVENTS("user-1", "google", "2026-01-01", "2026-01-31");
      expect(key).toBe("calendar_events:user-1:google:2026-01-01:2026-01-31");
    });

    it("should have static keys", () => {
      expect(CACHE_KEYS.FILTER_OPTIONS).toBe("filter_options");
      expect(CACHE_KEYS.QUESTIONNAIRE_SECTIONS).toBe("questionnaire_sections");
    });
  });

  describe("CACHE_TTLS", () => {
    it("should have correct TTL values", () => {
      expect(CACHE_TTLS.FILTER_OPTIONS).toBe(30 * 60 * 1000);
      expect(CACHE_TTLS.QUESTIONNAIRE_SECTIONS).toBe(60 * 60 * 1000);
      expect(CACHE_TTLS.USER_PROFILE).toBe(5 * 60 * 1000);
      expect(CACHE_TTLS.MATCHES).toBe(10 * 60 * 1000);
      expect(CACHE_TTLS.CALENDAR_EVENTS).toBe(3 * 60 * 1000);
    });
  });

  describe("invalidateUserCache", () => {
    it("should clear user-related cache keys", () => {
      const userId = "user-123";
      cache.set(CACHE_KEYS.USER_PROFILE(userId), { name: "Test" });
      cache.set(CACHE_KEYS.MATCHES(userId), []);
      cache.set(CACHE_KEYS.NETWORK_DATA(userId), {});
      cache.set("unrelated", "keep");

      invalidateUserCache(userId);

      expect(cache.get(CACHE_KEYS.USER_PROFILE(userId))).toBeUndefined();
      expect(cache.get(CACHE_KEYS.MATCHES(userId))).toBeUndefined();
      expect(cache.get(CACHE_KEYS.NETWORK_DATA(userId))).toBeUndefined();
      expect(cache.get("unrelated")).toBe("keep");
    });
  });
});
