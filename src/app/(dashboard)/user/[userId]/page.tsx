"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageCircle, Sparkles, Zap, Briefcase, Building2, Trophy, Activity, Users, Flame, TrendingUp, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { TeamsActionButtons } from "@/components/network/teams-action-buttons";
import { BadgeDisplay } from "@/components/gamification/badge-display";
import {
  InterestChipsPanel,
  hasProfileInterestContent,
} from "@/components/profile/interest-chips-panel";
import type { UserBadge } from "@/types";
import { parseBadgesFromApi } from "@/lib/gamification";
import { PhotoGallery } from "@/components/profile/photo-gallery";

interface UserInterests {
  rechargeActivities: string[];
  fitnessActivities: string[];
  volunteerCauses: string[];
  contentPreferences: string[];
  customInterests: string[];
  idealWeekend: string | null;
  leadershipPriorities: string[];
  networkingGoals: string[];
}

interface UserProfile {
  id: string;
  name: string;
  position: string;
  title: string;
  company?: string;
  photoUrl?: string;
}

interface MatchData {
  id: string;
  type: "high-affinity" | "strategic";
  score: number;
  commonalities: Array<{
    category: string;
    description: string;
    weight: number;
  }>;
  conversationStarters: string[];
}

interface UserActivityStats {
  totalPoints: number;
  messagesSent: number;
  connectionsMade: number;
  meetingsScheduled: number;
  currentDailyStreak: number;
}

interface UserConnection {
  id: string;
  name: string;
  title: string;
  company?: string;
  matchType: "high-affinity" | "strategic";
  photoUrl?: string;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [activityStats, setActivityStats] = useState<UserActivityStats | null>(null);
  const [userConnections, setUserConnections] = useState<UserConnection[]>([]);
  const [isActiveThisWeek, setIsActiveThisWeek] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [connectionSearch, setConnectionSearch] = useState("");
  const [connectionFilter, setConnectionFilter] = useState<"all" | "high-affinity" | "strategic">("all");
  const [showAllConnections, setShowAllConnections] = useState(false);
  const [interests, setInterests] = useState<UserInterests | null>(null);
  const [profileQuestionnaireCompleted, setProfileQuestionnaireCompleted] =
    useState(true);

  // Filtered connections based on search and filter
  const filteredConnections = useMemo(() => {
    let filtered = userConnections;
    
    if (connectionFilter !== "all") {
      filtered = filtered.filter(c => c.matchType === connectionFilter);
    }
    
    if (connectionSearch.trim()) {
      const search = connectionSearch.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(search) ||
        c.title?.toLowerCase().includes(search) ||
        c.company?.toLowerCase().includes(search)
      );
    }
    
    return filtered;
  }, [userConnections, connectionSearch, connectionFilter]);

  // Display limited or all connections
  const displayedConnections = showAllConnections ? filteredConnections : filteredConnections.slice(0, 6);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all data in parallel:
        // - Current user's matches (to find match data with this person)
        // - Target user's matches (their connections)
        // - Target user's badges
        // - Target user's activity
        // - Current user's profile (to check if own profile)
        const [matchesRes, userMatchesRes, badgesRes, activityRes, profileRes, interestsRes] = await Promise.all([
          fetch("/api/matches"),
          fetch(`/api/users/${userId}/matches`),
          fetch(`/api/activity/badges?userId=${userId}`),
          fetch(`/api/activity?userId=${userId}`),
          fetch("/api/profile"),
          fetch(`/api/users/${userId}/interests`),
        ]);
        
        const matchesData = await matchesRes.json();
        const userMatchesData = await userMatchesRes.json();
        const badgesData = await badgesRes.json();
        const interestsData = await interestsRes.json();
        const activityData = await activityRes.json();
        const profileData = await profileRes.json();

        // Check if viewing own profile
        if (profileData.success && profileData.data?.user?.id === userId) {
          setIsOwnProfile(true);
        }

        // Find match data between current user and target user
        if (matchesData.success && matchesData.data?.matches) {
          const match = matchesData.data.matches.find(
            (m: { matchedUserId: string }) => m.matchedUserId === userId
          );

          if (match) {
            setProfile(match.matchedUser.profile);
            if (match.matchedUser.email) setUserEmail(match.matchedUser.email);
            setMatchData({
              id: match.id,
              type: match.type,
              score: match.score,
              commonalities: match.commonalities,
              conversationStarters: match.conversationStarters,
            });
          } else {
            // User not in matches - try fetching their profile directly
            try {
              const directProfileRes = await fetch(`/api/profile?userId=${userId}`);
              const directProfileData = await directProfileRes.json();
              
              if (directProfileData.success && directProfileData.data?.user?.profile) {
                setProfile({
                  ...directProfileData.data.user.profile,
                  position: directProfileData.data.user.profile.position || directProfileData.data.user.profile.title,
                });
                if (directProfileData.data.user.email) setUserEmail(directProfileData.data.user.email);
              }
            } catch (err) {
              console.error("Failed to fetch direct profile:", err);
            }
          }
        } else {
          // No matches data - try fetching profile directly
          try {
            const directProfileRes = await fetch(`/api/profile?userId=${userId}`);
            const directProfileData = await directProfileRes.json();

            if (directProfileData.success && directProfileData.data?.user?.profile) {
              setProfile({
                ...directProfileData.data.user.profile,
                position: directProfileData.data.user.profile.position || directProfileData.data.user.profile.title,
              });
              if (directProfileData.data.user.email) setUserEmail(directProfileData.data.user.email);
            }
          } catch (err) {
            console.error("Failed to fetch direct profile:", err);
          }
        }

        // Set TARGET USER's connections (their matches)
        if (userMatchesData.success && userMatchesData.data?.matches) {
          const connections: UserConnection[] = userMatchesData.data.matches.map(
            (m: {
              id: string;
              name: string;
              position: string;
              company?: string;
              matchType: string;
              photoUrl?: string;
            }) => ({
              id: m.id,
              name: m.name,
              title: m.position,
              company: m.company,
              matchType: m.matchType as "high-affinity" | "strategic",
              photoUrl: m.photoUrl,
            })
          );
          setUserConnections(connections);
        }

        if (badgesData.badges !== undefined) {
          setBadges(parseBadgesFromApi(badgesData.badges));
        } else {
          setBadges([]);
        }

        // Set activity stats if available
        if (activityData.stats) {
          setActivityStats({
            totalPoints: activityData.stats.totalPoints || 0,
            messagesSent: activityData.stats.messagesSent || 0,
            connectionsMade: activityData.stats.connectionsMade || 0,
            meetingsScheduled: activityData.stats.meetingsScheduled || 0,
            currentDailyStreak: activityData.stats.currentDailyStreak || 0,
          });
        }

        if (interestsData.success && interestsData.data) {
          setInterests(interestsData.data.interests);
          setProfileQuestionnaireCompleted(
            !!interestsData.data.questionnaireCompleted
          );
        }
        
        // Check if user was active this week
        if (badgesData.badges?.length > 0) {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          const hasRecentActivity = badgesData.badges.some(
            (b: UserBadge) => new Date(b.updatedAt) > oneWeekAgo
          );
          setIsActiveThisWeek(hasRecentActivity);
        } else if (activityData.stats?.lastActiveAt) {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          setIsActiveThisWeek(new Date(activityData.stats.lastActiveAt) > oneWeekAgo);
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userId]);

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-white mb-4">User not found</h2>
        <p className="text-white/60 mb-6">This profile may not be available.</p>
        <Link href="/dashboard">
          <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 text-black">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.back()} className="gap-2 text-white/70 hover:text-white hover:bg-white/10">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      {/* Profile Header */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          <Avatar className="h-20 w-20 sm:h-24 sm:w-24 text-2xl border-2 border-white/20 shrink-0">
            <AvatarImage
              src={profile.photoUrl?.trim() || undefined}
              alt=""
            />
            <AvatarFallback className={cn(
              "text-black font-bold",
              matchData?.type === "high-affinity"
                ? "bg-gradient-to-br from-teal-500 to-teal-400"
                : "bg-gradient-to-br from-amber-500 to-amber-400"
            )}>
              {getInitials(profile.name)}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {profile.name}
              </h1>
              {matchData && (
                <Badge
                  className={cn(
                    "gap-1 font-medium border-0",
                    matchData.type === "high-affinity"
                      ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25"
                      : "bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-lg shadow-amber-500/25"
                  )}
                >
                  {matchData.type === "high-affinity" ? (
                    <><Sparkles className="h-3 w-3" /> High-Affinity</>
                  ) : (
                    <><Zap className="h-3 w-3" /> Strategic</>
                  )}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-white/70 mb-1">
              <Briefcase className="h-4 w-4 shrink-0" />
              <span className="truncate">{profile.position}</span>
              {profile.title && <span className="text-white/50 truncate">• {profile.title}</span>}
            </div>

            {profile.company && (
              <div className="flex items-center gap-2 text-cyan-400">
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="truncate">{profile.company}</span>
              </div>
            )}

            {matchData && (
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm text-white/50">Match strength</span>
                <div className="flex-1 max-w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full"
                    style={{ width: `${matchData.score * 100}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-white">
                  {Math.round(matchData.score * 100)}%
                </span>
              </div>
            )}

            {/* Activity indicator and badges preview */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {isActiveThisWeek && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                  <Activity className="h-3 w-3 text-green-400" />
                  <span className="text-xs text-green-400 font-medium">Active this week</span>
                </div>
              )}
              {badges.length > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/30">
                  <Trophy className="h-3 w-3 text-amber-400" />
                  <span className="text-xs text-amber-300 font-medium">{badges.length} badge{badges.length !== 1 ? 's' : ''}</span>
                </div>
              )}
              {userConnections.length > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-violet-500/20 border border-violet-500/30">
                  <Users className="h-3 w-3 text-violet-400" />
                  <span className="text-xs text-violet-300 font-medium">{userConnections.length} connection{userConnections.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons - hide on own profile */}
          {!isOwnProfile && userEmail && (
            <TeamsActionButtons
              targetEmail={userEmail}
              targetName={profile?.name ?? ""}
              targetUserId={userId}
              source="user_profile"
              showPass={false}
              className="flex-col sm:flex-row sm:flex-nowrap w-full sm:w-auto max-w-md"
            />
          )}
        </div>
      </div>

      {/* Activity Stats Section */}
      {activityStats && activityStats.totalPoints > 0 && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-cyan-400" />
            Networking Activity
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 rounded-xl border border-cyan-500/20 text-center">
              <p className="text-2xl font-bold text-white">{activityStats.totalPoints}</p>
              <p className="text-xs text-white/50 mt-1">Connection Points</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-purple-500/10 to-violet-500/10 rounded-xl border border-purple-500/20 text-center">
              <p className="text-2xl font-bold text-white">{activityStats.messagesSent}</p>
              <p className="text-xs text-white/50 mt-1">Messages Sent</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20 text-center">
              <p className="text-2xl font-bold text-white">{activityStats.connectionsMade}</p>
              <p className="text-xs text-white/50 mt-1">Connections Made</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-rose-500/10 to-pink-500/10 rounded-xl border border-rose-500/20 text-center flex flex-col items-center justify-center">
              <div className="flex items-center gap-1">
                <Flame className="h-5 w-5 text-orange-400" />
                <p className="text-2xl font-bold text-white">{activityStats.currentDailyStreak}</p>
              </div>
              <p className="text-xs text-white/50 mt-1">Day Streak</p>
            </div>
          </div>
        </div>
      )}

      {interests && hasProfileInterestContent(interests) && (
        <InterestChipsPanel
          interests={interests}
          title="Interests & Passions"
          variant="public"
        />
      )}
      {interests && !hasProfileInterestContent(interests) && profile && (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-6">
          <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2 mb-3">
            Interests &amp; Passions
          </h2>
          <p className="text-sm text-white/55 leading-relaxed">
            {profileQuestionnaireCompleted
              ? "This member hasn’t selected interests in their questionnaire yet, or those answers aren’t on file."
              : `${profile.name.split(" ")[0]} hasn’t completed the questionnaire yet — interests and hobbies will show here after they do.`}
          </p>
        </div>
      )}

      {/* Photo Gallery — self-hides when empty and isOwner=false */}
      <PhotoGallery userId={userId} isOwner={isOwnProfile} withContainer={true} />

      {/* Connections Section */}
      {userConnections.length > 0 && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-400" />
              {profile.name.split(" ")[0]}&apos;s Network
              <span className="text-white/30">({userConnections.length})</span>
            </h2>
            
            {/* Filter tabs */}
            <div className="flex items-center gap-1 bg-white/5 rounded-full p-1">
              <button
                onClick={() => setConnectionFilter("all")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-full transition-colors",
                  connectionFilter === "all" 
                    ? "bg-white/10 text-white" 
                    : "text-white/50 hover:text-white"
                )}
              >
                All
              </button>
              <button
                onClick={() => setConnectionFilter("high-affinity")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-full transition-colors flex items-center gap-1",
                  connectionFilter === "high-affinity" 
                    ? "bg-teal-500/20 text-teal-400" 
                    : "text-white/50 hover:text-teal-400"
                )}
              >
                <Sparkles className="h-3 w-3" />
                High-Affinity
              </button>
              <button
                onClick={() => setConnectionFilter("strategic")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-full transition-colors flex items-center gap-1",
                  connectionFilter === "strategic" 
                    ? "bg-amber-500/20 text-amber-400" 
                    : "text-white/50 hover:text-amber-400"
                )}
              >
                <Zap className="h-3 w-3" />
                Strategic
              </button>
            </div>
          </div>

          {/* Search input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="text"
              placeholder="Search connections by name, title, or company..."
              value={connectionSearch}
              onChange={(e) => setConnectionSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/25"
            />
            {connectionSearch && (
              <button 
                onClick={() => setConnectionSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-white/10"
              >
                <X className="h-4 w-4 text-white/40" />
              </button>
            )}
          </div>

          {/* Connections grid */}
          {filteredConnections.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {displayedConnections.map((conn) => (
                  <Link
                    key={conn.id}
                    href={`/user/${conn.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
                  >
                    <Avatar className="h-11 w-11 border border-white/20 group-hover:border-white/30 transition-colors shrink-0">
                      <AvatarImage
                        src={conn.photoUrl?.trim() || undefined}
                        alt=""
                      />
                      <AvatarFallback className={cn(
                        "text-xs font-semibold text-black",
                        conn.matchType === "high-affinity"
                          ? "bg-gradient-to-br from-teal-500 to-teal-400"
                          : "bg-gradient-to-br from-amber-500 to-amber-400"
                      )}>
                        {conn.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{conn.name}</p>
                        {conn.matchType === "high-affinity" ? (
                          <Sparkles className="h-3 w-3 text-teal-400 flex-shrink-0" />
                        ) : (
                          <Zap className="h-3 w-3 text-amber-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-white/50 truncate">{conn.title}</p>
                      {conn.company && (
                        <p className="text-xs text-white/30 truncate">{conn.company}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
              
              {/* Show more/less button */}
              {filteredConnections.length > 6 && (
                <button
                  onClick={() => setShowAllConnections(!showAllConnections)}
                  className="w-full mt-4 py-2.5 text-sm font-medium text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 rounded-full transition-colors"
                >
                  {showAllConnections 
                    ? `Show less` 
                    : `Show all ${filteredConnections.length} connections`
                  }
                </button>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-white/50">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No connections match your search</p>
            </div>
          )}
        </div>
      )}

      {/* Badges — Supabase-backed only; full grid so every profile shows the same six slots */}
      {profile && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Trophy className="h-5 w-5 shrink-0 text-yellow-400" aria-hidden />
              Achievements & Badges
            </h2>
            <span className="shrink-0 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/70">
              {badges.length === 0
                ? "No tiers yet"
                : `${badges.length} tier${badges.length !== 1 ? "s" : ""}`}
            </span>
          </div>
          <BadgeDisplay badges={badges} embedded />
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
            <div className="text-center">
              <p className="text-lg font-bold text-white">{badges.filter((b) => b.tier === "gold").length}</p>
              <p className="text-xs text-yellow-400/80">Gold</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">{badges.filter((b) => b.tier === "silver").length}</p>
              <p className="text-xs text-slate-300/80">Silver</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">{badges.filter((b) => b.tier === "bronze").length}</p>
              <p className="text-xs text-amber-500/90">Bronze</p>
            </div>
          </div>
        </div>
      )}

      {/* What you share / Why connect */}
      {matchData && matchData.commonalities.length > 0 && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">
            {matchData.type === "high-affinity" ? "What You Share" : "Why Connect"}
          </h2>
          <div className="space-y-3">
            {matchData.commonalities.map((commonality, index) => (
              <div key={index} className="flex items-start gap-3">
                <span className="text-lg">
                  {commonality.category === "professional" ? "💼" :
                   commonality.category === "hobby" ? "🎯" :
                   commonality.category === "values" ? "💡" :
                   commonality.category === "lifestyle" ? "🌟" : "🤝"}
                </span>
                <span className="text-white/80">{commonality.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversation starters */}
      {matchData && matchData.conversationStarters.length > 0 && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-cyan-400" />
            Conversation Starters
          </h2>
          <div className="space-y-3">
            {matchData.conversationStarters.map((starter, index) => (
              <div
                key={index}
                className="p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-white/80"
              >
                {starter}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick action footer - hide on own profile */}
      {!isOwnProfile && userEmail && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <TeamsActionButtons
            targetEmail={userEmail}
            targetName={profile?.name ?? ""}
            targetUserId={userId}
            source="user_profile"
            showPass={false}
            className="flex-col sm:flex-row"
          />
        </div>
      )}
    </div>
  );
}

