import OpenAI from 'openai';
import type { EmbeddingProvider } from './types';

const OPENAI_MODEL = 'text-embedding-3-small';
const DEFAULT_DIMENSIONS = parseInt(process.env.EMBEDDING_DIMENSIONS || '768', 10);

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'openai';
  readonly dimensions: number;
  readonly isConfigured: boolean;
  private client: OpenAI | null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    this.isConfigured = !!apiKey;
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
    this.dimensions = DEFAULT_DIMENSIONS;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.client) {
      throw new Error('OpenAI not configured. Set OPENAI_API_KEY in .env.local');
    }

    const response = await this.client.embeddings.create({
      model: OPENAI_MODEL,
      input: text,
      dimensions: this.dimensions,
    });

    return response.data[0].embedding;
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.client) {
      throw new Error('OpenAI not configured. Set OPENAI_API_KEY in .env.local');
    }

    const response = await this.client.embeddings.create({
      model: OPENAI_MODEL,
      input: texts,
      dimensions: this.dimensions,
    });

    return response.data.map((item) => item.embedding);
  }
}
