"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageCircle, UserPlus, Check, Clock, Sparkles, Briefcase, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";

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

interface ConnectionStatus {
  status: "none" | "pending" | "accepted" | "sent";
  connectionId?: string;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const userId = params.userId as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ status: "none" });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch matches to get user profile and match data
        const matchesRes = await fetch("/api/matches");
        const matchesData = await matchesRes.json();

        if (matchesData.success && matchesData.data?.matches) {
          const match = matchesData.data.matches.find(
            (m: { matchedUserId: string }) => m.matchedUserId === userId
          );

          if (match) {
            setProfile(match.matchedUser.profile);
            setMatchData({
              id: match.id,
              type: match.type,
              score: match.score,
              commonalities: match.commonalities,
              conversationStarters: match.conversationStarters,
            });
          }
        }

        // Fetch connection status
        const connectionsRes = await fetch("/api/connections");
        const connectionsData = await connectionsRes.json();

        if (connectionsData.success && connectionsData.data) {
          const connection = connectionsData.data.find(
            (c: { targetUserId?: string; requesterId?: string; status: string }) =>
              c.targetUserId === userId || c.requesterId === userId
          );

          if (connection) {
            setConnectionStatus({
              status: connection.status === "accepted" ? "accepted" : 
                      connection.requesterId === userId ? "pending" : "sent",
              connectionId: connection.id,
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userId]);

  async function handleConnect() {
    setActionLoading(true);
    try {
      const response = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: userId,
          matchId: matchData?.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setConnectionStatus({ status: "sent", connectionId: result.data.id });
        toast({
          title: "Connection request sent!",
          description: `${profile?.name} will be notified of your request.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Failed to send request",
          description: result.error,
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: "Please try again later",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMessage() {
    // For demo: navigate to messages with this user
    // In production, this would create/open a conversation
    router.push(`/messages?userId=${userId}`);
  }

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
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-navy-800 mb-4">User not found</h2>
        <p className="text-navy-600 mb-6">This profile may not be available.</p>
        <Link href="/dashboard">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.back()} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <Avatar className="h-24 w-24 text-2xl">
              <AvatarFallback className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
                {getInitials(profile.name)}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-navy-800 font-display">
                  {profile.name}
                </h1>
                {matchData && (
                  <Badge
                    variant={matchData.type === "high-affinity" ? "default" : "secondary"}
                    className={
                      matchData.type === "high-affinity"
                        ? "bg-teal-100 text-teal-700 hover:bg-teal-100"
                        : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                    }
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    {matchData.type === "high-affinity" ? "High-Affinity" : "Strategic"}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 text-navy-600 mb-1">
                <Briefcase className="h-4 w-4" />
                <span>{profile.position}</span>
                {profile.title && <span className="text-navy-400">• {profile.title}</span>}
              </div>

              {profile.company && (
                <div className="flex items-center gap-2 text-navy-600">
                  <Building2 className="h-4 w-4" />
                  <span>{profile.company}</span>
                </div>
              )}

              {matchData && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="text-sm font-medium text-navy-600">Match strength:</div>
                  <div className="flex-1 max-w-32 h-2 bg-navy-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full"
                      style={{ width: `${matchData.score * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-teal-700">
                    {Math.round(matchData.score * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 w-full md:w-auto">
              {connectionStatus.status === "accepted" ? (
                <Button onClick={handleMessage} className="gap-2 bg-teal-600 hover:bg-teal-700">
                  <MessageCircle className="h-4 w-4" />
                  Message
                </Button>
              ) : connectionStatus.status === "sent" ? (
                <Button disabled className="gap-2" variant="outline">
                  <Clock className="h-4 w-4" />
                  Request Sent
                </Button>
              ) : connectionStatus.status === "pending" ? (
                <Button className="gap-2 bg-teal-600 hover:bg-teal-700">
                  <Check className="h-4 w-4" />
                  Accept Request
                </Button>
              ) : (
                <Button
                  onClick={handleConnect}
                  disabled={actionLoading}
                  className="gap-2 bg-teal-600 hover:bg-teal-700"
                >
                  <UserPlus className="h-4 w-4" />
                  {actionLoading ? "Sending..." : "Connect"}
                </Button>
              )}

              {connectionStatus.status !== "accepted" && (
                <Button variant="outline" onClick={handleMessage} className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Message
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What you share / Why connect */}
      {matchData && matchData.commonalities.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-navy-500 uppercase tracking-wider mb-4">
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
                  <span className="text-navy-700">{commonality.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversation starters */}
      {matchData && matchData.conversationStarters.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-navy-500 uppercase tracking-wider mb-4">
              <MessageCircle className="h-4 w-4 inline mr-2" />
              Conversation Starters
            </h2>
            <div className="space-y-3">
              {matchData.conversationStarters.map((starter, index) => (
                <div
                  key={index}
                  className="p-4 bg-teal-50 rounded-xl border border-teal-100 text-navy-700"
                >
                  {starter}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

