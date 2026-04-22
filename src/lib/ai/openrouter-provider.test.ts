/** @vitest-environment node */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const chatCreateMock = vi.fn();
const openAIConstructorCalls: unknown[] = [];

class OpenAIStub {
  chat = { completions: { create: chatCreateMock } };
  constructor(options: unknown) {
    openAIConstructorCalls.push(options);
  }
}

vi.mock('openai', () => ({
  default: OpenAIStub,
}));

// Re-import fresh after each env/mock change
async function loadProvider() {
  vi.resetModules();
  const mod = await import('./openrouter-provider');
  const cooldownMod = await import('./cooldown');
  cooldownMod.clearCooldown();
  return { ...mod, ...cooldownMod };
}

describe('OpenRouterGenerativeProvider', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    chatCreateMock.mockReset();
    openAIConstructorCalls.length = 0;
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('is unconfigured when OPENROUTER_API_KEY is missing', async () => {
    delete process.env.OPENROUTER_API_KEY;
    const { OpenRouterGenerativeProvider } = await loadProvider();
    const provider = new OpenRouterGenerativeProvider();
    expect(provider.isConfigured).toBe(false);
    await expect(provider.generateText('hi')).rejects.toThrow('OpenRouter not configured');
  });

  it('instantiates OpenAI client with OpenRouter base URL and attribution headers', async () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-test';
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
    const { OpenRouterGenerativeProvider } = await loadProvider();
    new OpenRouterGenerativeProvider();
    expect(openAIConstructorCalls.length).toBe(1);
    expect(openAIConstructorCalls[0]).toMatchObject({
      apiKey: 'sk-or-test',
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://example.com',
        'X-Title': 'NetworkNav (Jynx)',
      },
    });
  });

  it('uses OPENROUTER_MODEL when set, otherwise default Gemma model', async () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-test';
    process.env.OPENROUTER_MODEL = 'some/other-model:free';
    chatCreateMock.mockResolvedValue({ choices: [{ message: { content: 'hi there' } }] });
    const { OpenRouterGenerativeProvider } = await loadProvider();
    const provider = new OpenRouterGenerativeProvider();
    await provider.generateText('prompt');
    expect(chatCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'some/other-model:free' }),
    );
  });

  it('defaults to google/gemma-4-31b-it:free when OPENROUTER_MODEL is unset', async () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-test';
    delete process.env.OPENROUTER_MODEL;
    chatCreateMock.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });
    const { OpenRouterGenerativeProvider } = await loadProvider();
    const provider = new OpenRouterGenerativeProvider();
    await provider.generateText('prompt');
    expect(chatCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'google/gemma-4-31b-it:free' }),
    );
  });

  it('returns trimmed content from chat completion', async () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-test';
    chatCreateMock.mockResolvedValue({ choices: [{ message: { content: '  hello world  ' } }] });
    const { OpenRouterGenerativeProvider } = await loadProvider();
    const provider = new OpenRouterGenerativeProvider();
    const out = await provider.generateText('prompt');
    expect(out).toBe('hello world');
  });

  it('marks cooldown and rethrows on 429', async () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-test';
    chatCreateMock.mockRejectedValue(Object.assign(new Error('rate limited'), { status: 429 }));
    const { OpenRouterGenerativeProvider, isInCooldown } = await loadProvider();
    const provider = new OpenRouterGenerativeProvider();
    await expect(provider.generateText('prompt')).rejects.toThrow();
    expect(isInCooldown()).toBe(true);
  });

  it('does not mark cooldown on non-429 errors', async () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-test';
    chatCreateMock.mockRejectedValue(Object.assign(new Error('bad request'), { status: 400 }));
    const { OpenRouterGenerativeProvider, isInCooldown } = await loadProvider();
    const provider = new OpenRouterGenerativeProvider();
    await expect(provider.generateText('prompt')).rejects.toThrow();
    expect(isInCooldown()).toBe(false);
  });
});
