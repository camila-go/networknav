import OpenAI from 'openai';
import type { GenerativeProvider } from './types';
import { markCooldown } from './cooldown';

const DEFAULT_MODEL = 'google/gemma-4-31b-it:free';
const BASE_URL = 'https://openrouter.ai/api/v1';
const TIMEOUT_MS = 10_000;

function isRateLimitError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const anyErr = err as { status?: number; code?: string | number; response?: { status?: number } };
  return anyErr.status === 429 || anyErr.response?.status === 429 || anyErr.code === 429;
}

function parseModelList(): string[] {
  const list = process.env.OPENROUTER_MODELS;
  if (list && list.trim()) {
    const parsed = list
      .split(',')
      .map((m) => m.trim())
      .filter((m) => m.length > 0);
    if (parsed.length > 0) return parsed;
  }
  const single = process.env.OPENROUTER_MODEL;
  return [single && single.trim() ? single.trim() : DEFAULT_MODEL];
}

/**
 * Generative AI provider backed by OpenRouter using the OpenAI-compatible API.
 *
 * Supports OpenRouter's server-side model fallback: if OPENROUTER_MODELS is a
 * comma-separated list, the primary is sent as `model` and the full chain is
 * sent as `extra_body.models` so OpenRouter transparently rotates on 429 /
 * downtime without a client round-trip.
 */
export class OpenRouterGenerativeProvider implements GenerativeProvider {
  readonly isConfigured: boolean;
  private client: OpenAI | null;
  private models: string[];

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    this.isConfigured = !!apiKey;
    this.models = parseModelList();
    this.client = apiKey
      ? new OpenAI({
          apiKey,
          baseURL: BASE_URL,
          timeout: TIMEOUT_MS,
          defaultHeaders: {
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            'X-Title': 'NetworkNav (Jynx)',
          },
        })
      : null;
  }

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    if (!this.client) {
      throw new Error('OpenRouter not configured. Set OPENROUTER_API_KEY in .env.local');
    }

    const [primary, ...fallbacks] = this.models;
    const messages = [
      ...(systemInstruction
        ? [{ role: 'system' as const, content: systemInstruction }]
        : []),
      { role: 'user' as const, content: prompt },
    ];

    // OpenRouter accepts a `models` array alongside the standard `model` field
    // for server-side fallback. The OpenAI SDK types don't know about it, so
    // we attach it via a loose cast.
    const params = {
      model: primary,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    };
    if (fallbacks.length > 0) {
      (params as unknown as { models: string[] }).models = this.models;
    }

    const startedAt = Date.now();
    try {
      const response = await this.client.chat.completions.create(params);
      const elapsed = Date.now() - startedAt;
      const served = (response as { model?: string }).model ?? primary;
      console.log(`[AI] served by ${served} in ${elapsed}ms`);
      return response.choices[0]?.message?.content?.trim() ?? '';
    } catch (err) {
      if (isRateLimitError(err)) {
        markCooldown();
      }
      throw err;
    }
  }
}
