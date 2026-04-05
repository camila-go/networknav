"use client";

import Link from "next/link";
import { Heart, Sparkles, Users, MessageCircle } from "lucide-react";
import { exploreInterestSearchHref } from "@/lib/explore-interest-link";
import { getQuestionById } from "@/lib/questionnaire-data";

export interface ProfileInterestData {
  archetype: string | null;
  teamQualities: string[];
  personalityTags: string[];
  talkTopic: string | null;
  headline: string | null;
  personalInterest: string | null;
}

function optionLabel(questionId: string, value: string): string {
  const q = getQuestionById(questionId)?.question;
  const opt = q?.options?.find((o) => o.value === value);
  return opt?.label || value.replace(/-/g, " ");
}

function InterestChip({
  label,
  chipClass,
  ringClass,
}: {
  label: string;
  chipClass: string;
  ringClass: string;
}) {
  const trimmed = label.trim();
  if (!trimmed) return null;
  return (
    <Link
      href={exploreInterestSearchHref(trimmed)}
      title={`Search explore for “${trimmed}”`}
      className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full border cursor-pointer transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 ${chipClass} ${ringClass}`}
    >
      {trimmed}
    </Link>
  );
}

export function hasProfileInterestContent(
  interests: ProfileInterestData
): boolean {
  return !!(
    (interests.archetype && interests.archetype.trim()) ||
    interests.teamQualities.length ||
    interests.personalityTags.length ||
    (interests.talkTopic && interests.talkTopic.trim()) ||
    (interests.headline && interests.headline.trim()) ||
    (interests.personalInterest && interests.personalInterest.trim())
  );
}

interface InterestChipsPanelProps {
  interests: ProfileInterestData;
  title: string;
  variant?: "profile" | "public";
}

export function InterestChipsPanel({
  interests,
  title,
  variant = "public",
}: InterestChipsPanelProps) {
  const accentRing =
    variant === "profile"
      ? "focus-visible:ring-violet-400/50"
      : "focus-visible:ring-cyan-400/50";

  if (!hasProfileInterestContent(interests)) return null;

  const archetypeLabel = interests.archetype
    ? optionLabel("archetype", interests.archetype)
    : null;

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-6">
      <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2 mb-4">
        <Heart className="h-4 w-4 text-pink-400" />
        {title}
      </h2>

      <div className="space-y-4">
        {archetypeLabel && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-medium text-white/60">
                Archetype
              </span>
            </div>
            <InterestChip
              label={archetypeLabel}
              chipClass="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-200 border-amber-500/30"
              ringClass={accentRing}
            />
          </div>
        )}

        {interests.teamQualities.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-xs font-medium text-white/60">
                On a team I bring
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {interests.teamQualities.map((v, i) => (
                <InterestChip
                  key={`t-${i}`}
                  label={optionLabel("teamQualities", v)}
                  chipClass="bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-300 border-violet-500/30"
                  ringClass={accentRing}
                />
              ))}
            </div>
          </div>
        )}

        {interests.personalityTags.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-fuchsia-400" />
              <span className="text-xs font-medium text-white/60">
                Summit style
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {interests.personalityTags.map((v, i) => (
                <InterestChip
                  key={`p-${i}`}
                  label={optionLabel("personalityTags", v)}
                  chipClass="bg-gradient-to-r from-fuchsia-500/20 to-pink-500/20 text-fuchsia-200 border-fuchsia-500/30"
                  ringClass={accentRing}
                />
              ))}
            </div>
          </div>
        )}

        {interests.talkTopic && interests.talkTopic.trim() && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-medium text-white/60">
                Could talk forever about
              </span>
            </div>
            <p className="text-sm text-white/80 leading-relaxed">
              {interests.talkTopic.trim()}
            </p>
          </div>
        )}

        {interests.personalInterest && interests.personalInterest.trim() && (
          <div>
            <span className="text-xs font-medium text-white/60 block mb-2">
              Outside of work
            </span>
            <p className="text-sm text-white/80 leading-relaxed">
              {interests.personalInterest.trim()}
            </p>
          </div>
        )}

        {interests.headline && interests.headline.trim() && (
          <div>
            <span className="text-xs font-medium text-white/60 block mb-2">
              Summit headline
            </span>
            <p className="text-sm text-white/90 italic border-l-2 border-cyan-500/40 pl-3">
              {interests.headline.trim()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
