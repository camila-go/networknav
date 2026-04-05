import OpenAI from 'openai';
import type { EmbeddingProvider, GenerativeProvider } from './types';

const OPENAI_MODEL = 'text-embedding-3-large';
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
const DEFAULT_DIMENSIONS = parseInt(process.env.EMBEDDING_DIMENSIONS || '1536', 10);

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

/** Chat completions for Jynx / generative features when `AI_PROVIDER=openai`. */
export class OpenAIGenerativeProvider implements GenerativeProvider {
  readonly isConfigured: boolean;
  private client: OpenAI | null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    this.isConfigured = !!apiKey;
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI not configured. Set OPENAI_API_KEY in .env.local');
    }

    const response = await this.client.chat.completions.create({
      model: CHAT_MODEL,
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
  }
}
