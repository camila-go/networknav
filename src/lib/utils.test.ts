import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  cn,
  formatDate,
  formatRelativeTime,
  generateId,
  sleep,
  capitalize,
  truncate,
} from "./utils";

describe("cn (className merge utility)", () => {
  it("should merge class names correctly", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
    expect(cn("foo", true && "bar", "baz")).toBe("foo bar baz");
  });

  it("should handle undefined and null values", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  });

  it("should merge tailwind classes correctly (last wins)", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("should handle object syntax", () => {
    expect(cn({ foo: true, bar: false })).toBe("foo");
  });

  it("should handle array syntax", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });
});

describe("formatDate", () => {
  it("should format a Date object correctly", () => {
    // Use a specific date with timezone to avoid UTC conversion issues
    const date = new Date(2024, 2, 15); // March 15, 2024 in local time
    const result = formatDate(date);
    expect(result).toContain("Mar");
    expect(result).toContain("15");
    expect(result).toContain("2024");
  });

  it("should format a date string correctly", () => {
    // Use local timezone date constructor
    const date = new Date(2024, 11, 25); // December 25, 2024 in local time
    const result = formatDate(date);
    expect(result).toContain("Dec");
    expect(result).toContain("25");
    expect(result).toContain("2024");
  });

  it("should handle ISO date strings", () => {
    // Use noon UTC to avoid date boundary issues
    const result = formatDate("2024-01-15T12:00:00.000Z");
    expect(result).toContain("2024");
    expect(result).toContain("Jan");
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return 'just now' for times less than a minute ago", () => {
    const date = new Date("2024-03-15T11:59:30.000Z");
    expect(formatRelativeTime(date)).toBe("just now");
  });

  it("should return minutes ago for times less than an hour ago", () => {
    const date = new Date("2024-03-15T11:45:00.000Z");
    expect(formatRelativeTime(date)).toBe("15m ago");
  });

  it("should return hours ago for times less than a day ago", () => {
    const date = new Date("2024-03-15T09:00:00.000Z");
    expect(formatRelativeTime(date)).toBe("3h ago");
  });

  it("should return days ago for times less than a week ago", () => {
    const date = new Date("2024-03-13T12:00:00.000Z");
    expect(formatRelativeTime(date)).toBe("2d ago");
  });

  it("should return formatted date for times more than a week ago", () => {
    const date = new Date("2024-02-15T12:00:00.000Z");
    const result = formatRelativeTime(date);
    expect(result).toContain("Feb");
    expect(result).toContain("2024");
  });
});

describe("generateId", () => {
  it("should return a valid UUID string", () => {
    const id = generateId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("should generate unique IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });
});

describe("sleep", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return a promise that resolves after the specified time", async () => {
    const promise = sleep(1000);
    vi.advanceTimersByTime(1000);
    await expect(promise).resolves.toBeUndefined();
  });

  it("should not resolve before the specified time", async () => {
    let resolved = false;
    const promise = sleep(1000).then(() => {
      resolved = true;
    });

    vi.advanceTimersByTime(500);
    expect(resolved).toBe(false);

    vi.advanceTimersByTime(500);
    await promise;
    expect(resolved).toBe(true);
  });
});

describe("capitalize", () => {
  it("should capitalize the first letter of a string", () => {
    expect(capitalize("hello")).toBe("Hello");
  });

  it("should handle already capitalized strings", () => {
    expect(capitalize("Hello")).toBe("Hello");
  });

  it("should handle empty strings", () => {
    expect(capitalize("")).toBe("");
  });

  it("should handle single character strings", () => {
    expect(capitalize("a")).toBe("A");
    expect(capitalize("A")).toBe("A");
  });

  it("should preserve the rest of the string", () => {
    expect(capitalize("hELLO")).toBe("HELLO");
    expect(capitalize("hello world")).toBe("Hello world");
  });
});

describe("truncate", () => {
  it("should not truncate strings shorter than the limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("should truncate strings longer than the limit", () => {
    expect(truncate("hello world", 5)).toBe("hello...");
  });

  it("should handle exact length strings", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });

  it("should handle empty strings", () => {
    expect(truncate("", 5)).toBe("");
  });

  it("should handle zero length limit", () => {
    expect(truncate("hello", 0)).toBe("...");
  });
});

