import type { MatchType } from "@/types";

/**
 * WCAG-compliant badge styles for High-Affinity and Strategic match types.
 * These provide consistent styling across the app with proper contrast ratios.
 * 
 * High-Affinity: Teal theme - represents strong personal connection
 * Strategic: Amber theme - represents professional opportunity
 */

export const MATCH_TYPE_STYLES = {
  "high-affinity": {
    badge: "bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-0 shadow-lg shadow-teal-500/25",
    badgeHover: "hover:from-teal-400 hover:to-cyan-400",
    avatar: "bg-gradient-to-br from-teal-500 to-teal-400 text-black",
    dot: "bg-teal-500",
    text: "text-teal-400",
    textMuted: "text-teal-300",
    label: "High-Affinity",
    icon: "Sparkles",
  },
  strategic: {
    badge: "bg-gradient-to-r from-amber-600 to-orange-500 text-white border-0 shadow-lg shadow-amber-500/25",
    badgeHover: "hover:from-amber-500 hover:to-orange-400",
    avatar: "bg-gradient-to-br from-amber-500 to-amber-400 text-black",
    dot: "bg-amber-500",
    text: "text-amber-400",
    textMuted: "text-amber-300",
    label: "Strategic",
    icon: "Zap",
  },
} as const;

/**
 * Get badge class names for a match type
 */
export function getMatchBadgeStyles(matchType: MatchType | "neutral"): string {
  if (matchType === "neutral") {
    return "bg-white/20 text-white/80 border-white/30";
  }
  return MATCH_TYPE_STYLES[matchType].badge;
}

/**
 * Get avatar class names for a match type
 */
export function getMatchAvatarStyles(matchType: MatchType | "neutral"): string {
  if (matchType === "neutral") {
    return "bg-white/20 text-white";
  }
  return MATCH_TYPE_STYLES[matchType].avatar;
}

/**
 * Get dot color class for a match type (used in legends)
 */
export function getMatchDotStyles(matchType: MatchType): string {
  return MATCH_TYPE_STYLES[matchType].dot;
}

/**
 * Get text color class for a match type
 */
export function getMatchTextStyles(matchType: MatchType): string {
  return MATCH_TYPE_STYLES[matchType].text;
}

/**
 * Get the display label for a match type
 */
export function getMatchLabel(matchType: MatchType): string {
  return MATCH_TYPE_STYLES[matchType].label;
}
