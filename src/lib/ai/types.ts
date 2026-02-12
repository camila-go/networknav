// ============================================
// AI Provider Interfaces
// ============================================

export interface EmbeddingProvider {
  /** Provider name for logging/diagnostics */
  readonly name: string;

  /** Whether this provider is properly configured and ready */
  readonly isConfigured: boolean;

  /** Embedding vector dimensions this provider produces */
  readonly dimensions: number;

  /** Generate an embedding vector for a single text */
  generateEmbedding(text: string): Promise<number[]>;

  /** Generate embedding vectors for multiple texts (batch) */
  generateBatchEmbeddings(texts: string[]): Promise<number[][]>;
}

export interface GenerativeProvider {
  /** Generate text given a prompt and optional system instruction */
  generateText(prompt: string, systemInstruction?: string): Promise<string>;
}

export type AIProviderType = 'openai' | 'vertex';
