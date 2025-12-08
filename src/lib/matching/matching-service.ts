/**
 * Matching Service
 * 
 * Generates matches for users based on their questionnaire responses
 * using market basket analysis.
 */

import type { QuestionnaireData, Match, MatchType, PublicUser, Commonality } from "@/types";
import {
  extractItemsets,
  calculateMatchScore,
  determineMatchType,
  generateConversationStarters,
} from "./market-basket-analysis";

// ============================================
// Types
// ============================================

interface UserWithResponses {
  id: string;
  profile: PublicUser["profile"];
  responses: Partial<QuestionnaireData>;
}

interface MatchCandidate {
  user: UserWithResponses;
  score: number;
  affinityScore: number;
  strategicScore: number;
  commonalities: Commonality[];
  matchType: MatchType;
}

interface MatchGenerationOptions {
  maxHighAffinityMatches?: number;
  maxStrategicMatches?: number;
  minMatchScore?: number;
  excludeUserIds?: string[];
}

const DEFAULT_OPTIONS: Required<MatchGenerationOptions> = {
  maxHighAffinityMatches: 3,
  maxStrategicMatches: 3,
  minMatchScore: 0.15,
  excludeUserIds: [],
};

// ============================================
// Core Matching Functions
// ============================================

/**
 * Generate matches for a user from a pool of candidates
 */
export function generateMatches(
  user: UserWithResponses,
  candidates: UserWithResponses[],
  options: MatchGenerationOptions = {}
): Match[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Filter out excluded users and the user themselves
  const eligibleCandidates = candidates.filter(
    (c) => c.id !== user.id && !opts.excludeUserIds.includes(c.id)
  );

  if (eligibleCandidates.length === 0) {
    return [];
  }

  // Calculate match scores for all candidates
  const matchCandidates: MatchCandidate[] = eligibleCandidates
    .map((candidate) => {
      const matchScore = calculateMatchScore(user.responses, candidate.responses);
      const matchType = determineMatchType(matchScore);

      return {
        user: candidate,
        score: matchScore.totalScore,
        affinityScore: matchScore.affinityScore,
        strategicScore: matchScore.strategicScore,
        commonalities: matchScore.commonalities,
        matchType,
      };
    })
    .filter((m) => m.score >= opts.minMatchScore);

  // Separate into high-affinity and strategic matches
  const highAffinityCandidates = matchCandidates
    .filter((m) => m.matchType === "high-affinity")
    .sort((a, b) => b.affinityScore - a.affinityScore);

  const strategicCandidates = matchCandidates
    .filter((m) => m.matchType === "strategic")
    .sort((a, b) => b.strategicScore - a.strategicScore);

  // Select top matches from each category
  const selectedHighAffinity = highAffinityCandidates.slice(
    0,
    opts.maxHighAffinityMatches
  );
  const selectedStrategic = strategicCandidates.slice(
    0,
    opts.maxStrategicMatches
  );

  // If we don't have enough of one type, fill with the other
  const totalNeeded = opts.maxHighAffinityMatches + opts.maxStrategicMatches;
  let allSelected = [...selectedHighAffinity, ...selectedStrategic];

  if (allSelected.length < totalNeeded) {
    const remaining = matchCandidates
      .filter((m) => !allSelected.includes(m))
      .sort((a, b) => b.score - a.score);
    allSelected = [...allSelected, ...remaining.slice(0, totalNeeded - allSelected.length)];
  }

  // Ensure diversity (not all from same industry if possible)
  allSelected = ensureMatchDiversity(allSelected);

  // Convert to Match objects
  return allSelected.map((candidate) => createMatch(user.id, candidate));
}

/**
 * Ensure diversity in matches (industry, leadership level, etc.)
 */
function ensureMatchDiversity(candidates: MatchCandidate[]): MatchCandidate[] {
  if (candidates.length <= 3) return candidates;

  const result: MatchCandidate[] = [];
  const seenAttributes = new Set<string>();

  // First pass: add unique matches
  for (const candidate of candidates) {
    const industry = candidate.user.responses.industry;
    const level = candidate.user.responses.leadershipLevel;
    const key = `${industry}-${level}`;

    if (!seenAttributes.has(key)) {
      result.push(candidate);
      seenAttributes.add(key);
    }

    if (result.length >= 6) break;
  }

  // Second pass: fill remaining spots with highest scores
  if (result.length < 6) {
    const remaining = candidates
      .filter((c) => !result.includes(c))
      .slice(0, 6 - result.length);
    result.push(...remaining);
  }

  return result;
}

/**
 * Create a Match object from a candidate
 */
function createMatch(userId: string, candidate: MatchCandidate): Match {
  const conversationStarters = generateConversationStarters(
    candidate.commonalities,
    candidate.matchType
  );

  return {
    id: generateMatchId(),
    userId,
    matchedUserId: candidate.user.id,
    matchedUser: {
      id: candidate.user.id,
      profile: candidate.user.profile,
      questionnaireCompleted: true,
    },
    type: candidate.matchType,
    commonalities: candidate.commonalities,
    conversationStarters,
    score: candidate.score,
    generatedAt: new Date(),
    viewed: false,
    passed: false,
  };
}

/**
 * Refresh matches for a user (called weekly or on profile update)
 */
export function refreshMatches(
  user: UserWithResponses,
  candidates: UserWithResponses[],
  existingMatches: Match[],
  options: MatchGenerationOptions = {}
): Match[] {
  // Exclude users that were matched in the last 30 days (unless they connected)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentlyMatchedIds = existingMatches
    .filter((m) => m.generatedAt > thirtyDaysAgo && !m.passed)
    .map((m) => m.matchedUserId);

  return generateMatches(user, candidates, {
    ...options,
    excludeUserIds: [...(options.excludeUserIds || []), ...recentlyMatchedIds],
  });
}

/**
 * Calculate match quality metrics for feedback
 */
export function calculateMatchQualityMetrics(matches: Match[]): {
  averageScore: number;
  highAffinityCount: number;
  strategicCount: number;
  categoryDistribution: Record<string, number>;
} {
  if (matches.length === 0) {
    return {
      averageScore: 0,
      highAffinityCount: 0,
      strategicCount: 0,
      categoryDistribution: {},
    };
  }

  const averageScore =
    matches.reduce((sum, m) => sum + m.score, 0) / matches.length;

  const highAffinityCount = matches.filter(
    (m) => m.type === "high-affinity"
  ).length;
  const strategicCount = matches.filter((m) => m.type === "strategic").length;

  const categoryDistribution: Record<string, number> = {};
  for (const match of matches) {
    for (const commonality of match.commonalities) {
      categoryDistribution[commonality.category] =
        (categoryDistribution[commonality.category] || 0) + 1;
    }
  }

  return {
    averageScore,
    highAffinityCount,
    strategicCount,
    categoryDistribution,
  };
}

// ============================================
// Helper Functions
// ============================================

function generateMatchId(): string {
  return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Score adjustments based on user preferences (future enhancement)
 */
export function applyPreferenceBoosts(
  matches: Match[],
  _preferences: Record<string, number>
): Match[] {
  // Future: Allow users to boost certain match criteria
  // For now, return matches as-is
  return matches;
}

