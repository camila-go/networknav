"use client";

import Link from "next/link";
import {
  Sparkles,
  Dumbbell,
  BookOpen,
  HandHeart,
  Target,
  Heart,
  Users,
} from "lucide-react";
import { exploreInterestSearchHref } from "@/lib/explore-interest-link";

export interface ProfileInterestData {
  rechargeActivities: string[];
  fitnessActivities: string[];
  volunteerCauses: string[];
  contentPreferences: string[];
  customInterests: string[];
  idealWeekend: string | null;
  leadershipPriorities: string[];
  networkingGoals: string[];
}

export function hasProfileInterestContent(
  interests: ProfileInterestData
): boolean {
  return !!(
    (interests.idealWeekend && interests.idealWeekend.trim()) ||
    interests.rechargeActivities.length ||
    interests.fitnessActivities.length ||
    interests.volunteerCauses.length ||
    interests.contentPreferences.length ||
    interests.customInterests.length ||
    interests.leadershipPriorities.length ||
    interests.networkingGoals.length
  );
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

interface InterestChipsPanelProps {
  interests: ProfileInterestData;
  /** Main section title */
  title: string;
  /** Slightly different fitness gradient on /profile vs /user */
  variant?: "profile" | "public";
}

export function InterestChipsPanel({
  interests,
  title,
  variant = "public",
}: InterestChipsPanelProps) {
  const fitnessChip =
    variant === "profile"
      ? "bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-300 border-emerald-500/30"
      : "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border-green-500/30";
  const fitnessRing =
    variant === "profile"
      ? "focus-visible:ring-emerald-400/50"
      : "focus-visible:ring-green-400/50";

  const customChip =
    variant === "profile"
      ? "bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-pink-300 border-pink-500/30"
      : "bg-gradient-to-r from-pink-500/20 to-fuchsia-500/20 text-pink-300 border-pink-500/30";

  if (!hasProfileInterestContent(interests)) return null;

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-6">
      <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2 mb-4">
        <Heart className="h-4 w-4 text-pink-400" />
        {title}
      </h2>

      <div className="space-y-4">
        {interests.rechargeActivities.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-xs font-medium text-white/60">
                How I Recharge
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {interests.rechargeActivities.map((activity, i) => (
                <InterestChip
                  key={`r-${i}`}
                  label={activity}
                  chipClass="bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-300 border-violet-500/30"
                  ringClass="focus-visible:ring-violet-400/50"
                />
              ))}
            </div>
          </div>
        )}

        {interests.fitnessActivities.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Dumbbell
                className={`h-3.5 w-3.5 ${variant === "profile" ? "text-emerald-400" : "text-green-400"}`}
              />
              <span className="text-xs font-medium text-white/60">
                Fitness &amp; Wellness
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {interests.fitnessActivities.map((activity, i) => (
                <InterestChip
                  key={`f-${i}`}
                  label={activity}
                  chipClass={fitnessChip}
                  ringClass={fitnessRing}
                />
              ))}
            </div>
          </div>
        )}

        {interests.contentPreferences.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-xs font-medium text-white/60">
                What I&apos;m Learning
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {interests.contentPreferences.map((pref, i) => (
                <InterestChip
                  key={`c-${i}`}
                  label={pref}
                  chipClass="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border-blue-500/30"
                  ringClass="focus-visible:ring-blue-400/50"
                />
              ))}
            </div>
          </div>
        )}

        {interests.volunteerCauses.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HandHeart className="h-3.5 w-3.5 text-rose-400" />
              <span className="text-xs font-medium text-white/60">
                Causes I Care About
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {interests.volunteerCauses.map((cause, i) => (
                <InterestChip
                  key={`v-${i}`}
                  label={cause}
                  chipClass="bg-gradient-to-r from-rose-500/20 to-pink-500/20 text-rose-300 border-rose-500/30"
                  ringClass="focus-visible:ring-rose-400/50"
                />
              ))}
            </div>
          </div>
        )}

        {interests.leadershipPriorities.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-medium text-white/60">
                Leadership Focus
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {interests.leadershipPriorities.map((priority, i) => (
                <InterestChip
                  key={`l-${i}`}
                  label={priority}
                  chipClass="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/30"
                  ringClass="focus-visible:ring-amber-400/50"
                />
              ))}
            </div>
          </div>
        )}

        {interests.networkingGoals.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-3.5 w-3.5 text-teal-400" />
              <span className="text-xs font-medium text-white/60">
                Networking Goals
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {interests.networkingGoals.map((goal, i) => (
                <InterestChip
                  key={`n-${i}`}
                  label={goal}
                  chipClass="bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-teal-200 border-teal-500/30"
                  ringClass="focus-visible:ring-teal-400/50"
                />
              ))}
            </div>
          </div>
        )}

        {interests.customInterests.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-3.5 w-3.5 text-pink-400" />
              <span className="text-xs font-medium text-white/60">
                Other Interests
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {interests.customInterests.map((interest, i) => (
                <InterestChip
                  key={`o-${i}`}
                  label={interest}
                  chipClass={customChip}
                  ringClass="focus-visible:ring-pink-400/50"
                />
              ))}
            </div>
          </div>
        )}

        {interests.idealWeekend && (
          <div className="mt-4 p-4 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl border border-white/10">
            <p className="text-xs font-medium text-white/40 mb-2">Ideal Weekend</p>
            <p className="text-sm text-white/80 italic">
              &ldquo;{interests.idealWeekend}&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
