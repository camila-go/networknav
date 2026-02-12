import { GoogleGenAI } from '@google/genai';
import type { EmbeddingProvider, GenerativeProvider } from './types';

const EMBEDDING_MODEL = 'text-embedding-005';
const GENERATIVE_MODEL = 'gemini-2.0-flash';
const DEFAULT_DIMENSIONS = parseInt(process.env.EMBEDDING_DIMENSIONS || '768', 10);

export class VertexAIProvider implements EmbeddingProvider, GenerativeProvider {
  readonly name = 'vertex';
  readonly dimensions: number;
  readonly isConfigured: boolean;
  private client: GoogleGenAI | null;

  constructor() {
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    this.isConfigured = !!project;
    this.dimensions = DEFAULT_DIMENSIONS;

    this.client = project
      ? new GoogleGenAI({ vertexai: true, project, location })
      : null;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.client) {
      throw new Error('Vertex AI not configured. Set GOOGLE_CLOUD_PROJECT.');
    }

    const response = await this.client.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
      config: { outputDimensionality: this.dimensions },
    });

    return response.embeddings![0].values!;
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.client) {
      throw new Error('Vertex AI not configured. Set GOOGLE_CLOUD_PROJECT.');
    }

    const response = await this.client.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: texts,
      config: { outputDimensionality: this.dimensions },
    });

    return response.embeddings!.map((e) => e.values!);
  }

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    if (!this.client) {
      throw new Error('Vertex AI not configured. Set GOOGLE_CLOUD_PROJECT.');
    }

    const response = await this.client.models.generateContent({
      model: GENERATIVE_MODEL,
      contents: prompt,
      config: {
        ...(systemInstruction ? { systemInstruction } : {}),
        maxOutputTokens: 1024,
        temperature: 0.7,
      },
    });

    return response.text ?? '';
  }
}
