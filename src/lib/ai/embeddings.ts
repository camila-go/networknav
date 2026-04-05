import { getEmbeddingProvider } from './provider-factory';

// Check if the active AI provider is configured
export const isAIConfigured = getEmbeddingProvider().isConfigured;

/** @deprecated Use isAIConfigured instead */
export const isOpenAIConfigured = isAIConfigured;

/**
 * Generate embedding vector from text using the active AI provider
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const provider = getEmbeddingProvider();
  if (!provider.isConfigured) {
    throw new Error(
      `AI provider "${provider.name}" not configured. Check environment variables.`
    );
  }

  try {
    return await provider.generateEmbedding(text);
  } catch (error) {
    console.error(`Error generating embedding via ${provider.name}:`, error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Create a searchable text representation of user profile
 * This text is converted to an embedding for similarity matching
 */
export function createProfileText(profile: {
  name?: string;
  bio?: string;
  interests?: string[];
  location?: string;
  age?: number;
  position?: string;
  title?: string;
  company?: string;
  questionnaireData?: Record<string, unknown>;
}): string {
  const parts: string[] = [];

  // Basic profile info
  if (profile.name) parts.push(`Name: ${profile.name}`);
  if (profile.bio) parts.push(`Bio: ${profile.bio}`);
  if (profile.position) parts.push(`Position: ${profile.position}`);
  if (profile.title) parts.push(`Title: ${profile.title}`);
  if (profile.company) parts.push(`Company: ${profile.company}`);
  if (profile.location) parts.push(`Location: ${profile.location}`);
  if (profile.age) parts.push(`Age: ${profile.age}`);

  if (profile.interests?.length) {
    parts.push(`Interests: ${profile.interests.join(', ')}`);
  }

  if (profile.questionnaireData) {
    const q = profile.questionnaireData;
    if (typeof q.roleSummary === "string" && q.roleSummary)
      parts.push(`Role: ${q.roleSummary}`);
    if (typeof q.archetype === "string" && q.archetype)
      parts.push(`Archetype: ${q.archetype}`);
    if (Array.isArray(q.teamQualities) && q.teamQualities.length)
      parts.push(`Team qualities: ${q.teamQualities.join(", ")}`);
    if (typeof q.growthArea === "string" && q.growthArea)
      parts.push(`Learning: ${q.growthArea}`);
    if (typeof q.talkTopic === "string" && q.talkTopic)
      parts.push(`Talk topic: ${q.talkTopic}`);
    if (typeof q.refinedInterest === "string" && q.refinedInterest)
      parts.push(`Focus: ${q.refinedInterest}`);
    if (typeof q.personalInterest === "string" && q.personalInterest)
      parts.push(`Outside work: ${q.personalInterest}`);
    if (Array.isArray(q.personalityTags) && q.personalityTags.length)
      parts.push(`Style: ${q.personalityTags.join(", ")}`);
    if (typeof q.joyTrigger === "string" && q.joyTrigger)
      parts.push(`Day-brightener: ${q.joyTrigger}`);
    if (typeof q.threeWords === "string" && q.threeWords)
      parts.push(`In three words: ${q.threeWords}`);
    if (typeof q.headline === "string" && q.headline)
      parts.push(`Summit headline: ${q.headline}`);
    if (typeof q.funFact === "string" && q.funFact)
      parts.push(`Fun fact: ${q.funFact}`);
  }

  return parts.join('\n');
}

/**
 * Batch generate embeddings for multiple texts
 * More efficient than generating one at a time
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const provider = getEmbeddingProvider();
  if (!provider.isConfigured) {
    throw new Error(
      `AI provider "${provider.name}" not configured. Check environment variables.`
    );
  }

  try {
    return await provider.generateBatchEmbeddings(texts);
  } catch (error) {
    console.error(`Error generating batch embeddings via ${provider.name}:`, error);
    throw new Error('Failed to generate batch embeddings');
  }
}

/**
 * Calculate cosine similarity between two embedding vectors
 * Returns a value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
