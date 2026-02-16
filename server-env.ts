// Must run before Next.js loads to ensure AsyncLocalStorage is available globally.
// Next.js expects globalThis.AsyncLocalStorage to be set (see next/dist/server/node-environment.js),
// but tsx's module transformation can disrupt the load order.
import { AsyncLocalStorage } from "async_hooks";

if (typeof globalThis.AsyncLocalStorage !== "function") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).AsyncLocalStorage = AsyncLocalStorage;
}
