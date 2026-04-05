/**
 * Market Basket Analysis for Leadership Matching
 * 
 * Uses association rule mining to identify patterns between user attributes
 * and calculate match scores based on shared/complementary traits.
 */

import type { QuestionnaireData, Commonality, CommonalityCategory } from "@/types";
import type { ConversationStarterExtras } from "@/lib/conversation-starters";
import { buildPersonalizedConversationStarters } from "@/lib/conversation-starters";

// ============================================
// Types
// ============================================

interface AttributeItem {
  category: CommonalityCategory;
  attribute: string;
  value: string;
  weight: number;
}

interface AssociationRule {
  antecedent: string[];
  consequent: string[];
  support: number;
  confidence: number;
  lift: number;
}

interface MatchScore {
  totalScore: number;
  commonalities: Commonality[];
  affinityScore: number;
  strategicScore: number;
}

/** Free-text Summit fields: token overlap boosts affinity (exact string match is rare). */
const TEXT_OVERLAP_FIELDS: (keyof QuestionnaireData)[] = [
  "roleSummary",
  "growthArea",
  "talkTopic",
  "refinedInterest",
  "personalInterest",
  "joyTrigger",
  "threeWords",
  "headline",
  "funFact",
];

const TEXT_OVERLAP_WEIGHT = 0.42;

function tokenizeForOverlap(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3)
  );
}

function jaccardStringSets(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter++;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Average Jaccard similarity of word tokens across paired text fields (both sides non-empty).
 */
export function calculateTextFieldOverlap(
  r1: Partial<QuestionnaireData>,
  r2: Partial<QuestionnaireData>
): number {
  let sum = 0;
  let n = 0;
  for (const key of TEXT_OVERLAP_FIELDS) {
    const v1 = r1[key];
    const v2 = r2[key];
    if (typeof v1 !== "string" || typeof v2 !== "string") continue;
    const s1 = v1.trim();
    const s2 = v2.trim();
    if (s1.length < 3 || s2.length < 3) continue;
    const t1 = tokenizeForOverlap(s1);
    const t2 = tokenizeForOverlap(s2);
    if (t1.size === 0 || t2.size === 0) continue;
    sum += jaccardStringSets(t1, t2);
    n++;
  }
  return n === 0 ? 0 : sum / n;
}

// ============================================
// Attribute Weights Configuration
// ============================================

const ATTRIBUTE_WEIGHTS: Record<keyof QuestionnaireData, { weight: number; category: CommonalityCategory }> = {
  roleSummary: { weight: 0.55, category: "professional" },
  archetype: { weight: 0.9, category: "professional" },
  teamQualities: { weight: 0.88, category: "professional" },
  growthArea: { weight: 0.75, category: "professional" },
  talkTopic: { weight: 0.72, category: "hobby" },
  refinedInterest: { weight: 0.65, category: "professional" },
  personalInterest: { weight: 0.8, category: "hobby" },
  personalityTags: { weight: 0.78, category: "lifestyle" },
  joyTrigger: { weight: 0.5, category: "lifestyle" },
  threeWords: { weight: 0.45, category: "values" },
  headline: { weight: 0.55, category: "professional" },
  funFact: { weight: 0.6, category: "hobby" },
};

// ============================================
// Complementary Attribute Pairs (for strategic matching)
// ============================================

const COMPLEMENTARY_PAIRS: Record<string, string[]> = {
  "archetype:builder": ["archetype:strategist", "archetype:creative"],
  "archetype:strategist": ["archetype:operator", "archetype:analyst"],
  "archetype:analyst": ["archetype:creative", "archetype:connector"],
  "archetype:creative": ["archetype:operator", "archetype:builder"],
  "archetype:operator": ["archetype:strategist", "archetype:connector"],
  "archetype:connector": ["archetype:builder", "archetype:analyst"],
};

// ============================================
// Core Matching Functions
// ============================================

/**
 * Extract itemsets from questionnaire responses
 */
export function extractItemsets(responses: Partial<QuestionnaireData>): AttributeItem[] {
  const items: AttributeItem[] = [];

  for (const [key, value] of Object.entries(responses)) {
    if (value === undefined || value === null || value === "") continue;

    const config = ATTRIBUTE_WEIGHTS[key as keyof QuestionnaireData];
    if (!config) continue;

    if (Array.isArray(value)) {
      // Multi-select: each selected value is an item
      for (const v of value) {
        items.push({
          category: config.category,
          attribute: key,
          value: v,
          weight: config.weight,
        });
      }
    } else {
      // Single value
      items.push({
        category: config.category,
        attribute: key,
        value: value as string,
        weight: config.weight,
      });
    }
  }

  return items;
}

/** True when questionnaire JSON has at least one weighted attribute (non-empty). */
export function hasUsableQuestionnaire(data: unknown): boolean {
  if (data == null || typeof data !== "object") return false;
  return extractItemsets(data as Partial<QuestionnaireData>).length > 0;
}

/**
 * Calculate Jaccard similarity between two itemsets
 */
export function calculateJaccardSimilarity(
  items1: AttributeItem[],
  items2: AttributeItem[]
): number {
  const set1 = new Set(items1.map((i) => `${i.attribute}:${i.value}`));
  const set2 = new Set(items2.map((i) => `${i.attribute}:${i.value}`));

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Calculate weighted similarity score
 */
export function calculateWeightedSimilarity(
  items1: AttributeItem[],
  items2: AttributeItem[]
): number {
  const map1 = new Map(items1.map((i) => [`${i.attribute}:${i.value}`, i]));
  const map2 = new Map(items2.map((i) => [`${i.attribute}:${i.value}`, i]));

  let matchedWeight = 0;
  let totalWeight = 0;

  // Calculate matched weights
  for (const [key, item] of map1) {
    totalWeight += item.weight;
    if (map2.has(key)) {
      matchedWeight += item.weight;
    }
  }

  // Add unique items from set2 to total
  for (const [key, item] of map2) {
    if (!map1.has(key)) {
      totalWeight += item.weight;
    }
  }

  if (totalWeight === 0) return 0;
  return matchedWeight / totalWeight;
}

/**
 * Find shared attributes between two users
 */
export function findSharedAttributes(
  items1: AttributeItem[],
  items2: AttributeItem[]
): Commonality[] {
  const commonalities: Commonality[] = [];
  const map2 = new Map(items2.map((i) => [`${i.attribute}:${i.value}`, i]));

  for (const item of items1) {
    const key = `${item.attribute}:${item.value}`;
    if (map2.has(key)) {
      commonalities.push({
        category: item.category,
        description: generateCommonalityDescription(item),
        weight: item.weight,
      });
    }
  }

  // Sort by weight (most important first) and deduplicate
  return deduplicateCommonalities(
    commonalities.sort((a, b) => b.weight - a.weight)
  );
}

/**
 * Find complementary attributes for strategic matching
 */
export function findComplementaryAttributes(
  items1: AttributeItem[],
  items2: AttributeItem[]
): Commonality[] {
  const commonalities: Commonality[] = [];
  const set2 = new Set(items2.map((i) => `${i.attribute}:${i.value}`));

  for (const item of items1) {
    const key = `${item.attribute}:${item.value}`;
    const complements = COMPLEMENTARY_PAIRS[key] || [];

    for (const complement of complements) {
      if (set2.has(complement)) {
        const [attr, val] = complement.split(":");
        commonalities.push({
          category: item.category,
          description: generateStrategicDescription(item, attr, val),
          weight: item.weight * 0.8, // Slightly lower weight for strategic matches
        });
      }
    }
  }

  return deduplicateCommonalities(
    commonalities.sort((a, b) => b.weight - a.weight)
  );
}

/**
 * Calculate strategic match score (complementary expertise)
 */
export function calculateStrategicScore(
  items1: AttributeItem[],
  items2: AttributeItem[]
): number {
  let strategicScore = 0;
  let possibleScore = 0;

  const set2 = new Set(items2.map((i) => `${i.attribute}:${i.value}`));

  for (const item of items1) {
    const key = `${item.attribute}:${item.value}`;
    const complements = COMPLEMENTARY_PAIRS[key] || [];
    
    if (complements.length > 0) {
      possibleScore += item.weight;
      
      for (const complement of complements) {
        if (set2.has(complement)) {
          strategicScore += item.weight * 0.8;
          break; // Count each attribute once
        }
      }
    }
  }

  if (possibleScore === 0) return 0;
  return strategicScore / possibleScore;
}

/**
 * Calculate complete match score between two users
 */
export function calculateMatchScore(
  responses1: Partial<QuestionnaireData>,
  responses2: Partial<QuestionnaireData>
): MatchScore {
  const items1 = extractItemsets(responses1);
  const items2 = extractItemsets(responses2);

  // Affinity: structured overlap + soft similarity on free-text answers (Summit questionnaire)
  const baseAffinity = calculateWeightedSimilarity(items1, items2);
  const textOverlap = calculateTextFieldOverlap(responses1, responses2);
  const affinityScore = Math.min(
    1,
    baseAffinity + textOverlap * TEXT_OVERLAP_WEIGHT
  );

  // Calculate strategic (complementary) score
  const strategicScore = calculateStrategicScore(items1, items2);

  // Find commonalities
  const sharedCommonalities = findSharedAttributes(items1, items2);
  const complementaryCommonalities = findComplementaryAttributes(items1, items2);

  // Combine and limit commonalities
  const allCommonalities = [...sharedCommonalities, ...complementaryCommonalities]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);

  // Calculate total score (weighted average favoring affinity)
  const totalScore = affinityScore * 0.6 + strategicScore * 0.4;

  return {
    totalScore,
    commonalities: allCommonalities,
    affinityScore,
    strategicScore,
  };
}

/**
 * Determine if a match is high-affinity or strategic.
 * Strategic wins only when complementarity clearly exceeds similarity; ties favor high-affinity.
 */
export function determineMatchType(
  matchScore: Pick<MatchScore, "affinityScore" | "strategicScore">
): "high-affinity" | "strategic" {
  const a = matchScore.affinityScore;
  const s = matchScore.strategicScore;

  if (s > a * 1.25) {
    return "strategic";
  }
  if (a > s * 1.25) {
    return "high-affinity";
  }
  return a >= s ? "high-affinity" : "strategic";
}

// ============================================
// Helper Functions
// ============================================

function generateCommonalityDescription(item: AttributeItem): string {
  const descriptions: Record<string, (value: string) => string> = {
    roleSummary: (v) => `Similar how-we-work note: ${v.slice(0, 80)}${v.length > 80 ? "…" : ""}`,
    archetype: (v) => `Both lean ${formatValue(v)}`,
    teamQualities: (v) => `Both bring ${formatValue(v)} to teams`,
    growthArea: (v) => `Learning overlap: ${formatValue(v)}`,
    talkTopic: (v) => `Could riff on ${formatValue(v)}`,
    refinedInterest: (v) => `Aligned focus: ${v.slice(0, 60)}${v.length > 60 ? "…" : ""}`,
    personalInterest: (v) => `Life-outside-work: ${formatValue(v)}`,
    personalityTags: (v) => `Same summit rhythm: ${formatValue(v)}`,
    joyTrigger: (v) => `Small joys: ${formatValue(v)}`,
    threeWords: (v) => `Self-summary overlap: ${formatValue(v)}`,
    headline: (v) => `Summit intent: ${v.slice(0, 70)}${v.length > 70 ? "…" : ""}`,
    funFact: (v) => `Fun fact energy: ${v.slice(0, 60)}${v.length > 60 ? "…" : ""}`,
  };

  const generator = descriptions[item.attribute];
  if (generator) {
    return generator(item.value);
  }
  return `Shared: ${formatValue(item.value)}`;
}

function generateStrategicDescription(
  item: AttributeItem,
  complementAttr: string,
  complementValue: string
): string {
  const attr = item.attribute;
  const val = formatValue(item.value);
  const compVal = formatValue(complementValue);

  if (attr === "archetype") {
    return `Complementary styles: ${val} + ${compVal}`;
  }

  return `Complementary expertise: ${val} + ${compVal}`;
}

function formatValue(value: string): string {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function deduplicateCommonalities(commonalities: Commonality[]): Commonality[] {
  const seen = new Set<string>();
  return commonalities.filter((c) => {
    const key = c.description.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================================
// Conversation Starters Generator
// ============================================

export function generateConversationStarters(
  commonalities: Commonality[],
  matchType: "high-affinity" | "strategic",
  recipientFirstName?: string,
  extras?: ConversationStarterExtras
): string[] {
  return buildPersonalizedConversationStarters(
    commonalities,
    matchType,
    recipientFirstName,
    extras
  );
}

