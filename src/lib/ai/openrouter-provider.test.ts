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
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    chatCreateMock.mockReset();
    openAIConstructorCalls.length = 0;
    process.env = { ...ORIGINAL_ENV };
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    logSpy.mockRestore();
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
    delete process.env.OPENROUTER_MODELS;
    chatCreateMock.mockResolvedValue({ choices: [{ message: { content: 'hi there' } }] });
    const { OpenRouterGenerativeProvider } = await loadProvider();
    const provider = new OpenRouterGenerativeProvider();
    await provider.generateText('prompt');
    expect(chatCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'some/other-model:free' }),
    );
    // Single model → no `models` fallback array on the request
    const sent = chatCreateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(sent.models).toBeUndefined();
  });

  it('defaults to google/gemma-4-31b-it:free when OPENROUTER_MODEL/MODELS are unset', async () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-test';
    delete process.env.OPENROUTER_MODEL;
    delete process.env.OPENROUTER_MODELS;
    chatCreateMock.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });
    const { OpenRouterGenerativeProvider } = await loadProvider();
    const provider = new OpenRouterGenerativeProvider();
    await provider.generateText('prompt');
    expect(chatCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'google/gemma-4-31b-it:free' }),
    );
  });

  it('parses OPENROUTER_MODELS comma-separated list and sends server-side fallback chain', async () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-test';
    process.env.OPENROUTER_MODELS =
      'google/gemma-4-31b-it:free, openai/gpt-oss-120b:free ,z-ai/glm-4.5-air:free';
    delete process.env.OPENROUTER_MODEL;
    chatCreateMock.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });
    const { OpenRouterGenerativeProvider } = await loadProvider();
    const provider = new OpenRouterGenerativeProvider();
    await provider.generateText('prompt');
    const sent = chatCreateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(sent.model).toBe('google/gemma-4-31b-it:free');
    expect(sent.models).toEqual([
      'google/gemma-4-31b-it:free',
      'openai/gpt-oss-120b:free',
      'z-ai/glm-4.5-air:free',
    ]);
  });

  it('OPENROUTER_MODELS takes precedence over OPENROUTER_MODEL', async () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-test';
    process.env.OPENROUTER_MODEL = 'fallback/model:free';
    process.env.OPENROUTER_MODELS = 'primary/model:free,backup/model:free';
    chatCreateMock.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });
    const { OpenRouterGenerativeProvider } = await loadProvider();
    const provider = new OpenRouterGenerativeProvider();
    await provider.generateText('prompt');
    const sent = chatCreateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(sent.model).toBe('primary/model:free');
    expect(sent.models).toEqual(['primary/model:free', 'backup/model:free']);
  });

  it('logs the served model from the response', async () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-test';
    process.env.OPENROUTER_MODELS = 'primary/model:free,backup/model:free';
    chatCreateMock.mockResolvedValue({
      choices: [{ message: { content: 'ok' } }],
      model: 'backup/model:free',
    });
    const { OpenRouterGenerativeProvider } = await loadProvider();
    const provider = new OpenRouterGenerativeProvider();
    await provider.generateText('prompt');
    const logged = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toMatch(/\[AI\] served by backup\/model:free in \d+ms/);
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
