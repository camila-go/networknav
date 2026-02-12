import type { AIProviderType, EmbeddingProvider, GenerativeProvider } from './types';
import { OpenAIEmbeddingProvider } from './openai-provider';
import { VertexAIProvider } from './vertex-provider';

let _embeddingProvider: EmbeddingProvider | null = null;
let _generativeProvider: GenerativeProvider | null = null;

function getProviderType(): AIProviderType {
  const provider = process.env.AI_PROVIDER || 'openai';
  if (provider !== 'openai' && provider !== 'vertex') {
    throw new Error(`Invalid AI_PROVIDER: "${provider}". Must be "openai" or "vertex".`);
  }
  return provider;
}

export function getEmbeddingProvider(): EmbeddingProvider {
  if (_embeddingProvider) return _embeddingProvider;

  const type = getProviderType();
  if (type === 'vertex') {
    _embeddingProvider = new VertexAIProvider();
  } else {
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

  // OpenAI provider does not implement GenerativeProvider currently
  return null;
}
