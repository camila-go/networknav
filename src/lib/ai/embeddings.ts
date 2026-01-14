import OpenAI from 'openai';

// Initialize OpenAI client
const openaiApiKey = process.env.OPENAI_API_KEY;

// Check if OpenAI is configured
export const isOpenAIConfigured = !!openaiApiKey;

// Create OpenAI client only if configured
const openai = isOpenAIConfigured 
  ? new OpenAI({ apiKey: openaiApiKey })
  : null;

/**
 * Generate embedding vector from text using OpenAI
 * Returns a 1536-dimensional vector for text-embedding-3-small model
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!openai) {
    throw new Error(
      'OpenAI not configured. Please set OPENAI_API_KEY in .env.local'
    );
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
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

  // Include questionnaire data for richer matching
  if (profile.questionnaireData) {
    const q = profile.questionnaireData;
    
    // Leadership context
    if (q.industry) parts.push(`Industry: ${q.industry}`);
    if (q.leadershipLevel) parts.push(`Leadership Level: ${q.leadershipLevel}`);
    if (q.organizationSize) parts.push(`Organization Size: ${q.organizationSize}`);
    if (q.yearsExperience) parts.push(`Years Experience: ${q.yearsExperience}`);
    
    // Leadership priorities and challenges
    if (Array.isArray(q.leadershipPriorities) && q.leadershipPriorities.length) {
      parts.push(`Leadership Priorities: ${q.leadershipPriorities.join(', ')}`);
    }
    if (Array.isArray(q.leadershipChallenges) && q.leadershipChallenges.length) {
      parts.push(`Leadership Challenges: ${q.leadershipChallenges.join(', ')}`);
    }
    if (Array.isArray(q.growthAreas) && q.growthAreas.length) {
      parts.push(`Growth Areas: ${q.growthAreas.join(', ')}`);
    }
    if (Array.isArray(q.networkingGoals) && q.networkingGoals.length) {
      parts.push(`Networking Goals: ${q.networkingGoals.join(', ')}`);
    }
    
    // Personal interests
    if (Array.isArray(q.rechargeActivities) && q.rechargeActivities.length) {
      parts.push(`Recharge Activities: ${q.rechargeActivities.join(', ')}`);
    }
    if (Array.isArray(q.customInterests) && q.customInterests.length) {
      parts.push(`Custom Interests: ${q.customInterests.join(', ')}`);
    }
    if (Array.isArray(q.fitnessActivities) && q.fitnessActivities.length) {
      parts.push(`Fitness Activities: ${q.fitnessActivities.join(', ')}`);
    }
    
    // Leadership style
    if (Array.isArray(q.leadershipPhilosophy) && q.leadershipPhilosophy.length) {
      parts.push(`Leadership Philosophy: ${q.leadershipPhilosophy.join(', ')}`);
    }
    if (q.decisionMakingStyle) parts.push(`Decision Making: ${q.decisionMakingStyle}`);
    if (q.communicationStyle) parts.push(`Communication Style: ${q.communicationStyle}`);
  }

  return parts.join('\n');
}

/**
 * Batch generate embeddings for multiple texts
 * More efficient than generating one at a time
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  if (!openai) {
    throw new Error(
      'OpenAI not configured. Please set OPENAI_API_KEY in .env.local'
    );
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });

    return response.data.map((item) => item.embedding);
  } catch (error) {
    console.error('Error generating batch embeddings:', error);
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

