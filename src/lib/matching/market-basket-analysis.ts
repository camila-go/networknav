/**
 * Market Basket Analysis for Leadership Matching
 * 
 * Uses association rule mining to identify patterns between user attributes
 * and calculate match scores based on shared/complementary traits.
 */

import type { QuestionnaireData, Commonality, CommonalityCategory } from "@/types";

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

// ============================================
// Attribute Weights Configuration
// ============================================

const ATTRIBUTE_WEIGHTS: Record<keyof QuestionnaireData, { weight: number; category: CommonalityCategory }> = {
  // Section 1: Leadership Context (high weight for professional matching)
  industry: { weight: 0.9, category: "professional" },
  yearsExperience: { weight: 0.6, category: "professional" },
  leadershipLevel: { weight: 0.85, category: "professional" },
  organizationSize: { weight: 0.5, category: "professional" },

  // Section 2: Building & Solving (high weight for challenge/goal alignment)
  leadershipPriorities: { weight: 0.9, category: "professional" },
  leadershipChallenges: { weight: 0.95, category: "professional" },
  growthAreas: { weight: 0.85, category: "professional" },
  networkingGoals: { weight: 0.8, category: "professional" },

  // Section 3: Beyond the Boardroom (hobby/lifestyle)
  rechargeActivities: { weight: 0.7, category: "hobby" },
  customInterests: { weight: 0.85, category: "hobby" }, // User-typed interests (high weight - specific)
  contentPreferences: { weight: 0.65, category: "hobby" },
  fitnessActivities: { weight: 0.6, category: "hobby" },
  idealWeekend: { weight: 0.55, category: "lifestyle" },
  volunteerCauses: { weight: 0.7, category: "values" },
  energizers: { weight: 0.75, category: "lifestyle" },

  // Section 4: Leadership Style (values/style alignment)
  leadershipPhilosophy: { weight: 0.9, category: "values" },
  decisionMakingStyle: { weight: 0.7, category: "values" },
  failureApproach: { weight: 0.65, category: "values" },
  relationshipValues: { weight: 0.85, category: "values" },
  communicationStyle: { weight: 0.6, category: "values" },
  leadershipSeason: { weight: 0.5, category: "professional" },
};

// ============================================
// Complementary Attribute Pairs (for strategic matching)
// ============================================

const COMPLEMENTARY_PAIRS: Record<string, string[]> = {
  // Industry complements
  "industry:technology": ["industry:finance", "industry:healthcare", "industry:consulting"],
  "industry:finance": ["industry:technology", "industry:consulting", "industry:real-estate"],
  "industry:healthcare": ["industry:technology", "industry:nonprofit", "industry:consulting"],
  
  // Leadership level complements (mentorship opportunities)
  "leadershipLevel:c-suite": ["leadershipLevel:director", "leadershipLevel:vp"],
  "leadershipLevel:vp": ["leadershipLevel:c-suite", "leadershipLevel:manager"],
  "leadershipLevel:director": ["leadershipLevel:c-suite", "leadershipLevel:senior-executive"],
  "leadershipLevel:manager": ["leadershipLevel:vp", "leadershipLevel:director"],
  "leadershipLevel:emerging": ["leadershipLevel:director", "leadershipLevel:vp", "leadershipLevel:manager"],
  
  // Organization size complements (different perspectives)
  "organizationSize:startup": ["organizationSize:enterprise", "organizationSize:large"],
  "organizationSize:enterprise": ["organizationSize:startup", "organizationSize:small"],
  
  // Leadership style complements
  "decisionMakingStyle:decisive": ["decisionMakingStyle:collaborative", "decisionMakingStyle:thoughtful"],
  "decisionMakingStyle:data-driven": ["decisionMakingStyle:decisive", "decisionMakingStyle:adaptive"],
  "decisionMakingStyle:collaborative": ["decisionMakingStyle:decisive", "decisionMakingStyle:strategic"],
  
  // Challenge/Growth complements (can help each other)
  "leadershipChallenges:talent": ["growthAreas:teams", "leadershipPriorities:mentoring"],
  "leadershipChallenges:change": ["growthAreas:change-mgmt", "leadershipPriorities:transformation"],
  "leadershipChallenges:communication": ["growthAreas:storytelling", "growthAreas:presence"],
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

  // Calculate affinity (similarity) score
  const affinityScore = calculateWeightedSimilarity(items1, items2);

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
 * Determine if a match is high-affinity or strategic
 */
export function determineMatchType(
  matchScore: MatchScore
): "high-affinity" | "strategic" {
  // If affinity score is significantly higher, it's a high-affinity match
  if (matchScore.affinityScore > matchScore.strategicScore * 1.3) {
    return "high-affinity";
  }
  // If strategic score is higher or close, it's strategic
  if (matchScore.strategicScore >= matchScore.affinityScore * 0.8) {
    return "strategic";
  }
  // Default to high-affinity if both are low
  return "high-affinity";
}

// ============================================
// Helper Functions
// ============================================

function generateCommonalityDescription(item: AttributeItem): string {
  const descriptions: Record<string, (value: string) => string> = {
    industry: (v) => `Both work in ${formatValue(v)}`,
    yearsExperience: (v) => `Similar leadership experience (${v} years)`,
    leadershipLevel: (v) => `Both at ${formatValue(v)} level`,
    organizationSize: (v) => `Both lead in ${formatValue(v)} organizations`,
    leadershipPriorities: (v) => `Shared priority: ${formatValue(v)}`,
    leadershipChallenges: (v) => `Both navigating ${formatValue(v)} challenges`,
    growthAreas: (v) => `Both developing ${formatValue(v)} skills`,
    networkingGoals: (v) => `Aligned networking goal: ${formatValue(v)}`,
    rechargeActivities: (v) => `Both enjoy ${formatValue(v)}`,
    contentPreferences: (v) => `Shared interest in ${formatValue(v)} content`,
    fitnessActivities: (v) => `Both active in ${formatValue(v)}`,
    idealWeekend: (v) => `Similar weekend preferences: ${formatValue(v)}`,
    volunteerCauses: (v) => `Both passionate about ${formatValue(v)}`,
    energizers: (v) => `Energized by ${formatValue(v)}`,
    leadershipPhilosophy: (v) => `Share ${formatValue(v)} leadership style`,
    decisionMakingStyle: (v) => `Both ${formatValue(v)} decision makers`,
    failureApproach: (v) => `Similar approach to setbacks: ${formatValue(v)}`,
    relationshipValues: (v) => `Both value ${formatValue(v)} in relationships`,
    communicationStyle: (v) => `${formatValue(v)} communication style`,
    leadershipSeason: (v) => `Both in ${formatValue(v)} mode`,
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

  if (attr === "industry") {
    return `Complementary industries: ${val} + ${compVal}`;
  }
  if (attr === "leadershipLevel") {
    return `Cross-level connection: ${val} ↔ ${compVal}`;
  }
  if (attr === "organizationSize") {
    return `Different scale perspectives: ${val} vs ${compVal}`;
  }
  if (attr === "decisionMakingStyle") {
    return `Complementary decision styles: ${val} + ${compVal}`;
  }
  if (attr.includes("Challenges") || attr.includes("Growth")) {
    return `Can help with each other's growth areas`;
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
  matchType: "high-affinity" | "strategic"
): string[] {
  const starters: string[] = [];

  for (const commonality of commonalities.slice(0, 2)) {
    if (commonality.category === "professional") {
      if (matchType === "high-affinity") {
        starters.push(`Discuss your shared experience with ${commonality.description.toLowerCase().replace("both", "").trim()}`);
      } else {
        starters.push(`Learn how they approach ${commonality.description.toLowerCase()}`);
      }
    } else if (commonality.category === "hobby") {
      starters.push(`Bond over your shared interest in ${commonality.description.toLowerCase().replace("both enjoy", "").trim()}`);
    } else if (commonality.category === "values") {
      starters.push(`Explore your aligned values around ${commonality.description.toLowerCase()}`);
    }
  }

  // Add generic fallback starters
  if (starters.length === 0) {
    if (matchType === "high-affinity") {
      starters.push("Share your current leadership challenges and wins");
    } else {
      starters.push("Explore how your different perspectives could create value together");
    }
  }

  return starters.slice(0, 3);
}

