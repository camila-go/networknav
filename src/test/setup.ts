import { afterEach, vi } from "vitest";

// Only import and run browser-specific setup when in jsdom environment
if (typeof window !== "undefined") {
  // Dynamic import for testing-library since it requires DOM
  import("@testing-library/jest-dom");
  import("@testing-library/react").then(({ cleanup }) => {
    afterEach(() => {
      cleanup();
    });
  });

  // Mock window.matchMedia
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock IntersectionObserver (must be a proper constructor for Next.js use-intersection)
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.IntersectionObserver;

  // Mock scrollIntoView and scrollTo (not implemented in jsdom)
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.scrollTo = vi.fn();

  // d3-zoom reads svg.width.baseVal.value / svg.height.baseVal.value
  Object.defineProperty(SVGElement.prototype, "width", {
    get() {
      return { baseVal: { value: 400 } };
    },
    configurable: true,
  });
  Object.defineProperty(SVGElement.prototype, "height", {
    get() {
      return { baseVal: { value: 400 } };
    },
    configurable: true,
  });

  // d3-interpolate parseSvg reads node.transform.baseVal.consolidate();
  // returning null causes d3 to fall back to identity transform.
  Object.defineProperty(SVGElement.prototype, "transform", {
    get() {
      return { baseVal: { consolidate: () => null } };
    },
    configurable: true,
  });
}

