import { describe, it, expect } from "vitest";
import { isSafeGalleryImageUrl } from "./safe-image-url";

describe("isSafeGalleryImageUrl", () => {
  it("accepts https URLs", () => {
    expect(isSafeGalleryImageUrl("https://example.com/a.jpg")).toBe(true);
  });

  it("rejects empty and non-url", () => {
    expect(isSafeGalleryImageUrl("")).toBe(false);
    expect(isSafeGalleryImageUrl(null)).toBe(false);
    expect(isSafeGalleryImageUrl("not a url")).toBe(false);
  });

  it("rejects javascript: URLs", () => {
    expect(isSafeGalleryImageUrl("javascript:alert(1)")).toBe(false);
  });
});
