import OpenAI from 'openai';

// Initialize OpenAI client
const openaiApiKey = process.env.OPENAI_API_KEY;
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

/**
 * Content moderation result
 */
export interface ModerationResult {
  flagged: boolean;
  categories: string[];
  scores?: Record<string, number>;
}

/**
 * Moderate content using OpenAI's moderation API
 * Returns whether content is flagged and which categories triggered
 */
export async function moderateContent(text: string): Promise<ModerationResult> {
  // If OpenAI is not configured, skip moderation (fail open)
  if (!openai) {
    console.warn('OpenAI not configured - skipping content moderation');
    return { flagged: false, categories: [] };
  }

  try {
    const moderation = await openai.moderations.create({
      input: text,
    });

    const result = moderation.results[0];

    // Get list of flagged categories
    const flaggedCategories = Object.entries(result.categories)
      .filter(([_, flagged]) => flagged)
      .map(([category]) => formatCategoryName(category));

    // Get scores for all categories (useful for logging/analytics)
    const scores = Object.fromEntries(
      Object.entries(result.category_scores).map(([cat, score]) => [
        formatCategoryName(cat),
        Math.round(score * 100) / 100,
      ])
    );

    return {
      flagged: result.flagged,
      categories: flaggedCategories,
      scores,
    };
  } catch (error) {
    console.error('Error moderating content:', error);
    // Fail open - don't block if moderation fails
    return { flagged: false, categories: [] };
  }
}

/**
 * Format category name for display
 * e.g., "sexual/minors" -> "Sexual Content (Minors)"
 */
function formatCategoryName(category: string): string {
  return category
    .split('/')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '))
    .join(' - ');
}

/**
 * Moderate multiple pieces of content
 * More efficient than calling moderateContent multiple times
 */
export async function moderateMultiple(
  texts: string[]
): Promise<ModerationResult[]> {
  if (!openai) {
    console.warn('OpenAI not configured - skipping content moderation');
    return texts.map(() => ({ flagged: false, categories: [] }));
  }

  try {
    const moderation = await openai.moderations.create({
      input: texts,
    });

    return moderation.results.map((result) => {
      const flaggedCategories = Object.entries(result.categories)
        .filter(([_, flagged]) => flagged)
        .map(([category]) => formatCategoryName(category));

      return {
        flagged: result.flagged,
        categories: flaggedCategories,
      };
    });
  } catch (error) {
    console.error('Error moderating content:', error);
    return texts.map(() => ({ flagged: false, categories: [] }));
  }
}

/**
 * Check if text contains potentially harmful content
 * Uses keyword matching as a fallback when API is unavailable
 */
export function containsHarmfulContent(text: string): boolean {
  const lowerText = text.toLowerCase();

  // Basic harmful content patterns (supplement API moderation)
  const harmfulPatterns = [
    /\b(kill|murder|attack|bomb|shoot)\b/i,
    /\b(hate|racist|nazi)\b/i,
    /\b(suicide|self-harm)\b/i,
  ];

  return harmfulPatterns.some((pattern) => pattern.test(lowerText));
}

/**
 * Sanitize user input by removing potentially harmful content
 * Use this for display purposes, not for storage
 */
export function sanitizeText(text: string): string {
  // Remove HTML tags
  let sanitized = text.replace(/<[^>]*>/g, '');

  // Remove potential script injections
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+=/gi, '');

  // Trim and limit length
  sanitized = sanitized.trim().slice(0, 10000);

  return sanitized;
}

/**
 * Check if profile content is appropriate
 * Combines API moderation with additional checks
 */
export async function moderateProfile(profile: {
  name?: string;
  bio?: string;
  interests?: string[];
}): Promise<ModerationResult> {
  const textToModerate: string[] = [];

  if (profile.name) textToModerate.push(profile.name);
  if (profile.bio) textToModerate.push(profile.bio);
  if (profile.interests?.length) {
    textToModerate.push(profile.interests.join(' '));
  }

  if (textToModerate.length === 0) {
    return { flagged: false, categories: [] };
  }

  const combinedText = textToModerate.join('\n');

  // Check for harmful content locally first (faster)
  if (containsHarmfulContent(combinedText)) {
    return {
      flagged: true,
      categories: ['Potentially Harmful Content'],
    };
  }

  // Use OpenAI moderation API
  return moderateContent(combinedText);
}

