/**
 * Shared cooldown state for the generative provider.
 *
 * When the upstream provider (OpenRouter free tier) returns 429, we pause all
 * generative calls for a short window so a single rate-limit spike doesn't burn
 * the remaining daily quota across every match card on a page render.
 *
 * Kept in its own module so both the provider (which sets cooldowns) and the
 * generative wrappers (which check cooldowns) can import it without a cycle.
 */

const COOLDOWN_MS = 60_000;

let cooldownUntil = 0;

export function markCooldown(durationMs: number = COOLDOWN_MS): void {
  cooldownUntil = Date.now() + durationMs;
}

export function isInCooldown(): boolean {
  return Date.now() < cooldownUntil;
}

export function clearCooldown(): void {
  cooldownUntil = 0;
}
