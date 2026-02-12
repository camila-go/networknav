/** @vitest-environment node */

import { describe, it, expect, vi } from "vitest";

// Mock provider modules
vi.mock("./openai-provider", () => ({
  OpenAIEmbeddingProvider: class {
    name = "openai";
    isConfigured = false;
    dimensions = 768;
    generateEmbedding = vi.fn();
    generateBatchEmbeddings = vi.fn();
  },
}));

vi.mock("./vertex-provider", () => ({
  VertexAIProvider: class {
    name = "vertex";
    isConfigured = false;
    dimensions = 768;
    generateEmbedding = vi.fn();
    generateBatchEmbeddings = vi.fn();
    generateText = vi.fn().mockResolvedValue("generated text");
  },
}));

describe("Provider Factory", () => {
  it("should throw for invalid AI_PROVIDER value", async () => {
    vi.resetModules();
    process.env.AI_PROVIDER = "invalid";
    const { getEmbeddingProvider } = await import("./provider-factory");
    expect(() => getEmbeddingProvider()).toThrow("Invalid AI_PROVIDER");
    delete process.env.AI_PROVIDER;
  });
});

describe("Provider Factory - OpenAI (default)", () => {
  it("should default to openai when AI_PROVIDER not set", async () => {
    vi.resetModules();
    delete process.env.AI_PROVIDER;
    const { getEmbeddingProvider } = await import("./provider-factory");
    const provider = getEmbeddingProvider();
    expect(provider.name).toBe("openai");
  });

  it("should return cached provider on second call (singleton)", async () => {
    vi.resetModules();
    delete process.env.AI_PROVIDER;
    const { getEmbeddingProvider } = await import("./provider-factory");
    const first = getEmbeddingProvider();
    const second = getEmbeddingProvider();
    expect(first).toBe(second);
  });

  it("should return null generative provider for openai", async () => {
    vi.resetModules();
    delete process.env.AI_PROVIDER;
    const { getGenerativeProvider } = await import("./provider-factory");
    expect(getGenerativeProvider()).toBeNull();
  });
});

describe("Provider Factory - Vertex", () => {
  it("should use vertex when AI_PROVIDER=vertex", async () => {
    vi.resetModules();
    process.env.AI_PROVIDER = "vertex";
    const { getEmbeddingProvider } = await import("./provider-factory");
    const provider = getEmbeddingProvider();
    expect(provider.name).toBe("vertex");
    delete process.env.AI_PROVIDER;
  });

  it("should return generative provider for vertex", async () => {
    vi.resetModules();
    process.env.AI_PROVIDER = "vertex";
    const { getGenerativeProvider } = await import("./provider-factory");
    expect(getGenerativeProvider()).not.toBeNull();
    delete process.env.AI_PROVIDER;
  });
});
