"use client";

import { Suspense, useState, useEffect } from "react";
import { ProfileForm } from "@/components/profile/profile-form";
import { PhotoGallery } from "@/components/profile/photo-gallery";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Users,
  Zap,
  Heart,
  Settings,
  Shield,
  Bell,
  Eye,
  EyeOff,
  Lock,
  Search,
  ChevronDown,
  ChevronUp,
  Award,
  Trophy,
  Flame,
  MessageSquare,
  Calendar,
  LogOut,
  HelpCircle,
  BookOpenCheck,
} from "lucide-react";
import { resetOnboarding } from "@/components/onboarding";
import { MATCH_TYPE_STYLES } from "@/lib/badge-styles";
import {
  InterestChipsPanel,
  hasProfileInterestContent,
} from "@/components/profile/interest-chips-panel";

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

interface UserBadge {
  id: string;
  badgeType: string;
  earnedAt: Date;
  metadata?: Record<string, unknown>;
}

interface ConnectionSummary {
  id: string;
  name: string;
  position?: string;
  company?: string;
  photoUrl?: string;
  matchType?: string;
}

interface ActivityStats {
  totalPoints: number;
  messagesSent: number;
  connectionsMade: number;
  meetingsScheduled: number;
  currentDailyStreak: number;
}

export default function ProfilePage() {
  const [interests, setInterests] = useState<UserInterests | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [connections, setConnections] = useState<ConnectionSummary[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [connectionSearch, setConnectionSearch] = useState("");
  const [showAllConnections, setShowAllConnections] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profileQuestionnaireCompleted, setProfileQuestionnaireCompleted] =
    useState(true);
  
  // Settings state
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [privacySettings, setPrivacySettings] = useState({
    showActivityStats: true,
    showConnections: true,
    showInterests: true,
    allowMessages: true,
    allowMeetingRequests: true,
  });
  const [notificationSettings, setNotificationSettings] = useState({
    newMatches: true,
    messages: true,
    meetingRequests: true,
    weeklyDigest: true,
    streakReminders: true,
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  async function fetchProfileData() {
    try {
      // Get current user ID
      const profileRes = await fetch("/api/profile");
      const profileData = await profileRes.json();
      if (profileData.success && profileData.data?.id) {
        setCurrentUserId(profileData.data.id);
        
        // Fetch user's data
        const [interestsRes, badgesRes, connectionsRes, activityRes] = await Promise.all([
          fetch(`/api/users/${profileData.data.id}/interests`),
          fetch(`/api/activity/badges?userId=${profileData.data.id}`),
          fetch(`/api/users/${profileData.data.id}/matches`),
          fetch("/api/activity"),
        ]);

        const [interestsData, badgesData, connectionsData, activityData] = await Promise.all([
          interestsRes.json(),
          badgesRes.json(),
          connectionsRes.json(),
          activityRes.json(),
        ]);

        if (interestsData.success && interestsData.data) {
          setInterests(interestsData.data.interests);
          setProfileQuestionnaireCompleted(
            !!interestsData.data.questionnaireCompleted
          );
        }
        if (badgesData.success) {
          setBadges(badgesData.badges || []);
        }
        if (connectionsData.success) {
          setConnections(connectionsData.data?.matches || []);
        }
        if (activityData.stats) {
          setStats(activityData.stats);
        }
      }
    } catch (error) {
      console.error("Failed to fetch profile data:", error);
    }
  }

  const filteredConnections = connections.filter(conn =>
    conn.name.toLowerCase().includes(connectionSearch.toLowerCase()) ||
    conn.position?.toLowerCase().includes(connectionSearch.toLowerCase()) ||
    conn.company?.toLowerCase().includes(connectionSearch.toLowerCase())
  );

  const displayedConnections = showAllConnections 
    ? filteredConnections 
    : filteredConnections.slice(0, 6);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const BADGE_INFO: Record<string, { icon: typeof Trophy; label: string; color: string }> = {
    "conversation-starter": { icon: MessageSquare, label: "Conversation Starter", color: "text-cyan-400" },
    "networking-streak": { icon: Flame, label: "Networking Streak", color: "text-orange-400" },
    "super-connector": { icon: Users, label: "Super Connector", color: "text-violet-400" },
    "weekly-warrior": { icon: Trophy, label: "Weekly Warrior", color: "text-amber-400" },
    "first-meeting": { icon: Calendar, label: "First Meeting", color: "text-teal-400" },
    "mentor": { icon: Award, label: "Mentor", color: "text-pink-400" },
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-3xl mx-auto space-y-6 px-4 py-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">
            Your Profile
          </h1>
          <p className="text-white/60 mt-1">
            Manage your profile, view your activity, and update settings
          </p>
        </div>

        {/* Profile Information */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">Profile Information</h2>
            <p className="text-sm text-white/50">
              This information is visible to your matches
            </p>
          </div>
          <Suspense fallback={<div className="h-64 bg-white/5 animate-pulse rounded-lg" />}>
            <ProfileForm />
          </Suspense>
        </div>

        {/* Photo Gallery */}
        {currentUserId && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">Photo Gallery</h2>
              <p className="text-sm text-white/50">
                Share photos from your leadership journey
              </p>
            </div>
            <PhotoGallery userId={currentUserId} isOwner={true} />
          </div>
        )}

        {/* Activity Stats */}
        {stats && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-6">
            <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Trophy className="h-4 w-4 text-amber-400" />
              Your Activity
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-lg p-3 text-center border border-amber-500/20">
                <p className="text-2xl font-bold text-amber-400">{stats.totalPoints}</p>
                <p className="text-xs text-white/60">Points</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                <p className="text-2xl font-bold text-white">{stats.currentDailyStreak}</p>
                <p className="text-xs text-white/60">Day Streak</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                <p className="text-2xl font-bold text-white">{stats.messagesSent}</p>
                <p className="text-xs text-white/60">Messages</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                <p className="text-2xl font-bold text-white">{stats.connectionsMade}</p>
                <p className="text-xs text-white/60">Connections</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                <p className="text-2xl font-bold text-white">{stats.meetingsScheduled}</p>
                <p className="text-xs text-white/60">Meetings</p>
              </div>
            </div>
          </div>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-6">
            <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Award className="h-4 w-4 text-violet-400" />
              Your Badges
            </h2>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => {
                const info = BADGE_INFO[badge.badgeType] || { icon: Award, label: badge.badgeType, color: "text-white" };
                const IconComponent = info.icon;
                return (
                  <div
                    key={badge.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30"
                  >
                    <IconComponent className={cn("h-4 w-4", info.color)} />
                    <span className="text-sm font-medium text-white">{info.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Your Connections */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-400" />
              Your Connections ({connections.length})
            </h2>
          </div>

          {connections.length > 0 ? (
            <>
              {connections.length > 6 && (
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    placeholder="Search connections..."
                    value={connectionSearch}
                    onChange={(e) => setConnectionSearch(e.target.value)}
                    className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {displayedConnections.map((conn) => {
                  const style = conn.matchType ? MATCH_TYPE_STYLES[conn.matchType as keyof typeof MATCH_TYPE_STYLES] : null;
                  return (
                    <Link
                      key={conn.id}
                      href={`/user/${conn.id}`}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors"
                    >
                      <Avatar className="h-12 w-12 border-2 border-white/20">
                        <AvatarImage src={conn.photoUrl} />
                        <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-black font-semibold">
                          {conn.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-center">
                        <p className="text-sm font-medium text-white truncate max-w-[120px]">{conn.name}</p>
                        {conn.position && (
                          <p className="text-xs text-white/50 truncate max-w-[120px]">{conn.position}</p>
                        )}
                      </div>
                      {style && (
                        <Badge className={cn("text-[10px] px-2 py-0.5", style.badge)}>
                          {style.label}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>

              {filteredConnections.length > 6 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllConnections(!showAllConnections)}
                  className="w-full mt-3 text-white/60 hover:text-white"
                >
                  {showAllConnections ? (
                    <>Show Less <ChevronUp className="h-4 w-4 ml-1" /></>
                  ) : (
                    <>Show All ({filteredConnections.length}) <ChevronDown className="h-4 w-4 ml-1" /></>
                  )}
                </Button>
              )}
            </>
          ) : (
            <p className="text-sm text-white/50 text-center py-4">
              No connections yet. Start networking to build your connections!
            </p>
          )}
        </div>

        {interests && hasProfileInterestContent(interests) && (
          <InterestChipsPanel
            interests={interests}
            title="Your Interests & Passions"
            variant="profile"
          />
        )}
        {interests && !hasProfileInterestContent(interests) && (
          <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-6">
            <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Your Interests & Passions
            </h2>
            <p className="text-sm text-white/55 mb-4">
              {profileQuestionnaireCompleted
                ? "Your questionnaire doesn’t include interest answers yet. Update it to show chips here and improve matches."
                : "Complete the questionnaire to add your interests — they’ll appear as chips others can explore."}
            </p>
            <Link
              href="/onboarding"
              className="text-sm font-medium text-cyan-400 hover:text-cyan-300"
            >
              {profileQuestionnaireCompleted
                ? "Update questionnaire →"
                : "Complete questionnaire →"}
            </Link>
          </div>
        )}

        {/* Questionnaire */}
        <div
          id="questionnaire"
          className="rounded-xl bg-white/5 border border-white/10 p-6"
        >
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">Questionnaire Responses</h2>
            <p className="text-sm text-white/50">
              Update your answers to improve your matches
            </p>
          </div>
          <a
            href="/onboarding"
            className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
          >
            Retake Questionnaire →
          </a>
        </div>

        {/* Settings & Privacy */}
        <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
          <button
            onClick={() => toggleSection("privacy")}
            className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/20">
                <Shield className="h-5 w-5 text-violet-400" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-semibold text-white">Privacy Settings</h2>
                <p className="text-sm text-white/50">Control what others can see</p>
              </div>
            </div>
            {expandedSection === "privacy" ? (
              <ChevronUp className="h-5 w-5 text-white/50" />
            ) : (
              <ChevronDown className="h-5 w-5 text-white/50" />
            )}
          </button>
          
          {expandedSection === "privacy" && (
            <div className="px-6 pb-6 space-y-4 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="h-4 w-4 text-white/50" />
                  <div>
                    <p className="text-sm font-medium text-white">Show Activity Stats</p>
                    <p className="text-xs text-white/50">Let others see your points and streaks</p>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.showActivityStats}
                  onCheckedChange={(checked) => setPrivacySettings(s => ({ ...s, showActivityStats: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-white/50" />
                  <div>
                    <p className="text-sm font-medium text-white">Show Connections</p>
                    <p className="text-xs text-white/50">Let others see who you're connected with</p>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.showConnections}
                  onCheckedChange={(checked) => setPrivacySettings(s => ({ ...s, showConnections: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Heart className="h-4 w-4 text-white/50" />
                  <div>
                    <p className="text-sm font-medium text-white">Show Interests</p>
                    <p className="text-xs text-white/50">Let others see your interests and hobbies</p>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.showInterests}
                  onCheckedChange={(checked) => setPrivacySettings(s => ({ ...s, showInterests: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-white/50" />
                  <div>
                    <p className="text-sm font-medium text-white">Allow Messages</p>
                    <p className="text-xs text-white/50">Let others send you messages</p>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.allowMessages}
                  onCheckedChange={(checked) => setPrivacySettings(s => ({ ...s, allowMessages: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-white/50" />
                  <div>
                    <p className="text-sm font-medium text-white">Allow Meeting Requests</p>
                    <p className="text-xs text-white/50">Let others request meetings with you</p>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.allowMeetingRequests}
                  onCheckedChange={(checked) => setPrivacySettings(s => ({ ...s, allowMeetingRequests: checked }))}
                />
              </div>
            </div>
          )}
        </div>

        {/* Notification Settings */}
        <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
          <button
            onClick={() => toggleSection("notifications")}
            className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Bell className="h-5 w-5 text-cyan-400" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-semibold text-white">Notification Settings</h2>
                <p className="text-sm text-white/50">Manage your notification preferences</p>
              </div>
            </div>
            {expandedSection === "notifications" ? (
              <ChevronUp className="h-5 w-5 text-white/50" />
            ) : (
              <ChevronDown className="h-5 w-5 text-white/50" />
            )}
          </button>
          
          {expandedSection === "notifications" && (
            <div className="px-6 pb-6 space-y-4 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">New Matches</p>
                  <p className="text-xs text-white/50">Get notified when you have new matches</p>
                </div>
                <Switch
                  checked={notificationSettings.newMatches}
                  onCheckedChange={(checked) => setNotificationSettings(s => ({ ...s, newMatches: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Messages</p>
                  <p className="text-xs text-white/50">Get notified when you receive messages</p>
                </div>
                <Switch
                  checked={notificationSettings.messages}
                  onCheckedChange={(checked) => setNotificationSettings(s => ({ ...s, messages: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Meeting Requests</p>
                  <p className="text-xs text-white/50">Get notified for meeting requests</p>
                </div>
                <Switch
                  checked={notificationSettings.meetingRequests}
                  onCheckedChange={(checked) => setNotificationSettings(s => ({ ...s, meetingRequests: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Weekly Digest</p>
                  <p className="text-xs text-white/50">Receive a weekly summary of your activity</p>
                </div>
                <Switch
                  checked={notificationSettings.weeklyDigest}
                  onCheckedChange={(checked) => setNotificationSettings(s => ({ ...s, weeklyDigest: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Streak Reminders</p>
                  <p className="text-xs text-white/50">Get reminded to maintain your streak</p>
                </div>
                <Switch
                  checked={notificationSettings.streakReminders}
                  onCheckedChange={(checked) => setNotificationSettings(s => ({ ...s, streakReminders: checked }))}
                />
              </div>
            </div>
          )}
        </div>

        {/* Account Settings */}
        <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
          <button
            onClick={() => toggleSection("account")}
            className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Settings className="h-5 w-5 text-amber-400" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-semibold text-white">Account Settings</h2>
                <p className="text-sm text-white/50">Manage your account and security</p>
              </div>
            </div>
            {expandedSection === "account" ? (
              <ChevronUp className="h-5 w-5 text-white/50" />
            ) : (
              <ChevronDown className="h-5 w-5 text-white/50" />
            )}
          </button>
          
          {expandedSection === "account" && (
            <div className="px-6 pb-6 space-y-4 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Lock className="h-4 w-4 text-white/50" />
                  <div>
                    <p className="text-sm font-medium text-white">Change Password</p>
                    <p className="text-xs text-white/50">Update your account password</p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-white/50 -rotate-90" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-white/50" />
                  <div>
                    <p className="text-sm font-medium text-white">Two-Factor Authentication</p>
                    <p className="text-xs text-white/50">Add an extra layer of security</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs text-white/50 border-white/20">Coming Soon</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <EyeOff className="h-4 w-4 text-white/50" />
                  <div>
                    <p className="text-sm font-medium text-white">Download My Data</p>
                    <p className="text-xs text-white/50">Export all your data</p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-white/50 -rotate-90" />
              </div>
              <div className="pt-4 border-t border-white/10">
                <Button
                  variant="outline"
                  className="w-full gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  onClick={() => {
                    // Logout logic
                    window.location.href = "/api/auth/logout";
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Help & Support */}
        <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
          <button
            onClick={() => toggleSection("help")}
            className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <HelpCircle className="h-5 w-5 text-cyan-400" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-semibold text-white">Help & Support</h2>
                <p className="text-sm text-white/50">Learn how to use Jynx</p>
              </div>
            </div>
            {expandedSection === "help" ? (
              <ChevronUp className="h-5 w-5 text-white/50" />
            ) : (
              <ChevronDown className="h-5 w-5 text-white/50" />
            )}
          </button>
          
          {expandedSection === "help" && (
            <div className="px-6 pb-6 space-y-4 border-t border-white/10 pt-4">
              <button
                onClick={() => {
                  resetOnboarding();
                  window.location.reload();
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <BookOpenCheck className="h-4 w-4 text-cyan-400" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">View App Tour</p>
                    <p className="text-xs text-white/50">Learn how matches, streaks, and badges work</p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-white/50 -rotate-90" />
              </button>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-white/50" />
                  <div>
                    <p className="text-sm font-medium text-white">Contact Support</p>
                    <p className="text-xs text-white/50">Get help from our team</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs text-white/50 border-white/20">Coming Soon</Badge>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
