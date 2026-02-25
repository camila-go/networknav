// Load .env.local before anything else so process.env is populated
// when auth.ts and other modules initialize at import time.
import { readFileSync } from "fs";
import { resolve } from "path";

try {
  const envLocal = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of envLocal.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
} catch {
  // .env.local doesn't exist — that's fine, warnings will show
}

// Must run before Next.js loads to ensure AsyncLocalStorage is available globally.
// Next.js expects globalThis.AsyncLocalStorage to be set (see next/dist/server/node-environment.js),
// but tsx's module transformation can disrupt the load order.
import { AsyncLocalStorage } from "async_hooks";

if (typeof globalThis.AsyncLocalStorage !== "function") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).AsyncLocalStorage = AsyncLocalStorage;
}
