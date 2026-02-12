import { getGenerativeProvider } from './provider-factory';

/**
 * Generate AI-powered conversation starters for a match.
 * Returns null if no generative provider is available,
 * allowing callers to fall back to their algorithmic approach.
 */
export async function generateConversationStartersAI(context: {
  userName: string;
  matchName: string;
  matchType: 'high-affinity' | 'strategic';
  commonalities: string[];
  matchPosition?: string;
  matchCompany?: string;
}): Promise<string[] | null> {
  const provider = getGenerativeProvider();
  if (!provider) return null;

  const systemInstruction = `You are a professional networking assistant for a leadership conference app.
Generate 2-3 short, warm, personable conversation starters for someone about to meet a new connection.
Each starter should be 1 sentence, feel genuine (not corporate), and reference specific shared context.
Return ONLY the starters, one per line. No numbering, no quotes.`;

  const prompt = `Generate conversation starters for ${context.userName} to use when meeting ${context.matchName}.
Match type: ${context.matchType}
${context.matchPosition ? `Their role: ${context.matchPosition}` : ''}
${context.matchCompany ? `Their company: ${context.matchCompany}` : ''}
What they have in common: ${context.commonalities.join('; ')}`;

  try {
    const text = await provider.generateText(prompt, systemInstruction);
    const starters = text
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 10 && s.length < 200);
    return starters.length > 0 ? starters.slice(0, 3) : null;
  } catch (error) {
    console.warn('AI conversation starter generation failed, falling back:', error);
    return null;
  }
}

/**
 * Generate a short AI profile summary for a user.
 * Returns null when no generative provider is available.
 */
export async function generateProfileSummary(profileText: string): Promise<string | null> {
  const provider = getGenerativeProvider();
  if (!provider) return null;

  const systemInstruction = `Summarize this professional profile in 2-3 sentences.
Be warm and highlight what makes this person interesting to connect with at a leadership conference.`;

  try {
    return await provider.generateText(profileText, systemInstruction);
  } catch (error) {
    console.warn('AI profile summary generation failed:', error);
    return null;
  }
}
