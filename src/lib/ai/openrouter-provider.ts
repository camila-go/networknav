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

/**
 * Generative AI provider backed by OpenRouter using the OpenAI-compatible API.
 * Target model is a free Gemma variant; rate-limit pressure is the only real cost.
 */
export class OpenRouterGenerativeProvider implements GenerativeProvider {
  readonly isConfigured: boolean;
  private client: OpenAI | null;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    this.isConfigured = !!apiKey;
    this.model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
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

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          ...(systemInstruction
            ? [{ role: 'system' as const, content: systemInstruction }]
            : []),
          { role: 'user' as const, content: prompt },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content?.trim() ?? '';
    } catch (err) {
      if (isRateLimitError(err)) {
        markCooldown();
      }
      throw err;
    }
  }
}
