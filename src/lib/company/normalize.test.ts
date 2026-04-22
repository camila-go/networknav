import { describe, it, expect } from "vitest";
import { normalizeCompany } from "./normalize";

describe("normalizeCompany", () => {
  it("maps 3-digit Strategic Education codes to display names", () => {
    expect(normalizeCompany("SS001")).toBe("Strategic Education, Inc.");
    expect(normalizeCompany("CU001")).toBe("Capella University");
    expect(normalizeCompany("SU001")).toBe("Strayer University");
  });

  it("maps legacy 2-digit codes to display names", () => {
    expect(normalizeCompany("SS01")).toBe("Strategic Education, Inc.");
    expect(normalizeCompany("CU01")).toBe("Capella University");
    expect(normalizeCompany("SU01")).toBe("Strayer University");
  });

  it("is case-insensitive", () => {
    expect(normalizeCompany("ss001")).toBe("Strategic Education, Inc.");
    expect(normalizeCompany("Cu001")).toBe("Capella University");
    expect(normalizeCompany("su01")).toBe("Strayer University");
  });

  it("trims surrounding whitespace before matching", () => {
    expect(normalizeCompany("  SS001  ")).toBe("Strategic Education, Inc.");
    expect(normalizeCompany("\tCU001\n")).toBe("Capella University");
  });

  it("passes through unknown values unchanged", () => {
    expect(normalizeCompany("Acme Corp")).toBe("Acme Corp");
    expect(normalizeCompany("Strategic Education, Inc.")).toBe(
      "Strategic Education, Inc."
    );
  });

  it("preserves null and undefined", () => {
    expect(normalizeCompany(null)).toBeNull();
    expect(normalizeCompany(undefined)).toBeUndefined();
  });

  it("preserves empty strings", () => {
    expect(normalizeCompany("")).toBe("");
  });
});
