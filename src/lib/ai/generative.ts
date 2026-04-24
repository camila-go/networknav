import { createHash } from 'crypto';
import { cache } from '@/lib/cache';
import { getGenerativeProvider } from './provider-factory';
import { isInCooldown } from './cooldown';
import {
  STARTER_PROMPT_VERSION,
  buildCacheVersion,
  readStarterCache,
  writeStarterCache,
} from './starter-cache';

const AI_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function hashInput(input: string): string {
  return createHash('sha1').update(input).digest('hex').slice(0, 16);
}

export type ConversationStarterOutcome =
  | { starters: string[]; reason: 'ai_success' | 'cache_hit' | 'persisted_cache_hit' }
  | { starters: null; reason: 'cooldown' | 'no_provider' | 'empty' | 'error' };

/**
 * Generate AI-powered conversation starters for a match.
 * Returns `{ starters: null, reason }` when generation didn't produce starters,
 * so callers can distinguish cooldown/provider-missing/error cases from
 * genuinely empty AI output.
 *
 * When `viewerId` and `matchId` are provided and Supabase is configured, the
 * result is cached in `ai_conversation_starters` so it survives cold starts
 * and is shared across serverless instances.
 */
export async function generateConversationStartersAI(context: {
  userName: string;
  matchName: string;
  matchType: 'high-affinity' | 'strategic';
  commonalities: string[];
  matchPosition?: string;
  matchCompany?: string;
  viewerId?: string;
  matchId?: string;
}): Promise<ConversationStarterOutcome> {
  const matchTag = context.matchId ? ` matchId=${context.matchId}` : '';
  const cacheKey = `ai:convstart:${hashInput(
    `${STARTER_PROMPT_VERSION}|${context.userName}|${context.matchName}|${context.matchType}|${context.commonalities.join(',')}|${context.matchPosition ?? ''}|${context.matchCompany ?? ''}`,
  )}`;

  const cached = cache.get<string[]>(cacheKey);
  if (cached) {
    console.log(`[AI] starters cache_hit${matchTag}`);
    return { starters: cached, reason: 'cache_hit' };
  }

  const cacheVersion = buildCacheVersion({
    matchType: context.matchType,
    commonalities: context.commonalities,
    matchPosition: context.matchPosition,
    matchCompany: context.matchCompany,
  });

  if (context.viewerId && context.matchId) {
    const persisted = await readStarterCache(context.viewerId, context.matchId, cacheVersion);
    if (persisted) {
      cache.set(cacheKey, persisted, AI_CACHE_TTL_MS);
      console.log(`[AI] starters persisted_cache_hit${matchTag}`);
      return { starters: persisted, reason: 'persisted_cache_hit' };
    }
  }

  if (isInCooldown()) {
    console.log(`[AI] starters cooldown_skip${matchTag}`);
    return { starters: null, reason: 'cooldown' };
  }

  const provider = getGenerativeProvider();
  if (!provider) {
    console.log(`[AI] starters no_provider${matchTag}`);
    return { starters: null, reason: 'no_provider' };
  }

  const systemInstruction = `You are a professional networking assistant for a leadership conference app.
Write exactly 3 opening lines that ${context.userName} will send directly to ${context.matchName}.
These are ${context.userName}'s words, spoken to ${context.matchName}.

Rules:
- Address ${context.matchName} by first name where it flows naturally (e.g. "${context.matchName}, …"). Never address or name ${context.userName}.
- Write from ${context.userName}'s first-person perspective (use "I", "we", "our").
- Each line is ONE sentence, warm and specific — reference ${context.matchName}'s role, company, or shared context where natural.
- Vary the shape: mix a question, an observation, and a light invitation — do not start all three the same way.
- Avoid generic phrases like "I'd love to connect" or "pick your brain" unless rephrased uniquely.
- No numbering, bullets, or quote marks — one starter per line only.`;

  const prompt = `Sender: ${context.userName} (do not name in output)
Recipient: ${context.matchName}
Match type: ${context.matchType}
${context.matchPosition ? `Recipient's role: ${context.matchPosition}` : ""}
${context.matchCompany ? `Recipient's company: ${context.matchCompany}` : ""}
Shared context: ${context.commonalities.length ? context.commonalities.join(" | ") : "(infer from role/company)"}`;

  try {
    const text = await provider.generateText(prompt, systemInstruction);
    const senderFirst = context.userName.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
    const starters = text
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 10 && s.length < 200)
      .filter((s) => {
        if (!senderFirst) return true;
        const leadToken = s.split(/[,:—\-…]/, 1)[0]?.trim().toLowerCase() ?? '';
        return leadToken !== senderFirst;
      });
    if (starters.length < 2) {
      console.log(`[AI] starters ai_empty${matchTag}`);
      return { starters: null, reason: 'empty' };
    }
    const result = starters.slice(0, 3);
    cache.set(cacheKey, result, AI_CACHE_TTL_MS);
    if (context.viewerId && context.matchId) {
      void writeStarterCache(context.viewerId, context.matchId, cacheVersion, result);
    }
    console.log(`[AI] starters ai_success${matchTag} count=${result.length}`);
    return { starters: result, reason: 'ai_success' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[AI] starters ai_error${matchTag}: ${msg}`);
    return { starters: null, reason: 'error' };
  }
}

/**
 * Generate a brief, contextual reaction to a user's questionnaire answer.
 * Used in the conversational onboarding flow to make the experience feel interactive.
 * Returns null when no generative provider is available, allowing callers to fall back to canned templates.
 */
export async function generateQuestionReaction(
  questionText: string,
  userAnswer: string,
  previousContext: { question: string; answer: string }[],
): Promise<string | null> {
  const contextLines = previousContext
    .slice(-3)
    .map((c) => `Q: ${c.question}\nA: ${c.answer}`)
    .join('\n');

  const cacheKey = `ai:reaction:${hashInput(`${questionText}|${userAnswer}|${contextLines}`)}`;
  const cached = cache.get<string>(cacheKey);
  if (cached) return cached;

  if (isInCooldown()) return null;

  const provider = getGenerativeProvider();
  if (!provider) return null;

  const systemInstruction = `You are Jynx, a warm and witty conference networking concierge for a leadership summit.
React briefly (1 sentence, max 25 words) to the user's questionnaire answer.
Rules:
- Be genuine, not generic. Reference their specific answer when possible.
- Vary your tone: mix encouragement, humor, and insight.
- Never be preachy or over-the-top. Think "great conference host" energy.
- No emojis. No questions back. Just a quick, natural reaction.`;

  const prompt = `${contextLines ? `Previous answers:\n${contextLines}\n\n` : ''}Current question: ${questionText}\nUser's answer: ${userAnswer}`;

  try {
    const text = await provider.generateText(prompt, systemInstruction);
    const reaction = text.split('\n')[0].trim();
    if (reaction.length <= 10) return null;
    cache.set(cacheKey, reaction, AI_CACHE_TTL_MS);
    return reaction;
  } catch (error) {
    console.warn('AI question reaction generation failed:', error);
    return null;
  }
}

/**
 * Generate a short AI profile summary for a user.
 * Returns null when no generative provider is available.
 */
export async function generateProfileSummary(profileText: string): Promise<string | null> {
  const cacheKey = `ai:summary:${hashInput(profileText)}`;
  const cached = cache.get<string>(cacheKey);
  if (cached) return cached;

  if (isInCooldown()) return null;

  const provider = getGenerativeProvider();
  if (!provider) return null;

  const systemInstruction = `Summarize this professional profile in 2-3 sentences.
Be warm and highlight what makes this person interesting to connect with at a leadership conference.`;

  try {
    const summary = await provider.generateText(profileText, systemInstruction);
    if (!summary) return null;
    cache.set(cacheKey, summary, AI_CACHE_TTL_MS);
    return summary;
  } catch (error) {
    console.warn('AI profile summary generation failed:', error);
    return null;
  }
}

export type NetworkAssistantTurn = { role: 'user' | 'assistant'; content: string };

/**
 * Jynx in-app chat is disabled — out of scope for the current AI integration.
 * Callers fall back to their canned response path.
 */
export async function generateJynxNetworkReply(
  _networkContextBlock: string,
  _history: NetworkAssistantTurn[],
): Promise<string | null> {
  return null;
}
