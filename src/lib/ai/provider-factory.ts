import type { AIProviderType, EmbeddingProvider, GenerativeProvider } from './types';
import { OpenAIEmbeddingProvider } from './openai-provider';
import { VertexAIProvider } from './vertex-provider';
import { OpenRouterGenerativeProvider } from './openrouter-provider';

let _embeddingProvider: EmbeddingProvider | null = null;
let _generativeProvider: GenerativeProvider | null = null;

function getProviderType(): AIProviderType {
  const provider = process.env.AI_PROVIDER || 'openai';
  if (provider !== 'openai' && provider !== 'vertex' && provider !== 'openrouter') {
    throw new Error(`Invalid AI_PROVIDER: "${provider}". Must be "openai", "vertex", or "openrouter".`);
  }
  return provider;
}

export function getEmbeddingProvider(): EmbeddingProvider {
  if (_embeddingProvider) return _embeddingProvider;

  const type = getProviderType();
  if (type === 'vertex') {
    _embeddingProvider = new VertexAIProvider();
  } else {
    // OpenRouter doesn't serve embeddings for our needs; embeddings continue to
    // go through the OpenAI provider (admin-gated pgvector path only).
    _embeddingProvider = new OpenAIEmbeddingProvider();
  }
  return _embeddingProvider;
}

export function getGenerativeProvider(): GenerativeProvider | null {
  if (_generativeProvider) return _generativeProvider;

  const type = getProviderType();
  if (type === 'vertex') {
    _generativeProvider = new VertexAIProvider();
    return _generativeProvider;
  }

  if (type === 'openrouter') {
    const provider = new OpenRouterGenerativeProvider();
    if (!provider.isConfigured) return null;
    _generativeProvider = provider;
    return _generativeProvider;
  }

  return null;
}

/** Reset cached singletons; intended for tests. */
export function _resetProviderCache(): void {
  _embeddingProvider = null;
  _generativeProvider = null;
}
