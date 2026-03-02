/**
 * Dev Seed Endpoint
 *
 * POST /api/dev/seed
 *
 * Populates all in-memory stores with realistic demo data so every
 * feature can be exercised locally. Blocked in production.
 */

import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { generateId } from "@/lib/utils";
import {
  users,
  type StoredUser,
  questionnaireResponses,
  connections,
  messages,
  userMatches,
  meetings,
  notifications,
  notificationPreferences,
  getDefaultPreferences,
} from "@/lib/stores";
import { generateMatches } from "@/lib/matching/matching-service";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type { QuestionnaireData, Connection, Message, Meeting, Notification } from "@/types";

// ============================================
// Seed User Profiles
// ============================================

interface SeedUser {
  name: string;
  email: string;
  position: string;
  title: string;
  company: string;
  location: string;
  responses: Partial<QuestionnaireData>;
}

const SEED_PASSWORD = "Password123";

const seedUsers: SeedUser[] = [
  {
    name: "Sarah Chen",
    email: "sarah@example.com",
    position: "VP Engineering",
    title: "Engineering Leader",
    company: "TechCorp",
    location: "San Francisco, CA",
    responses: {
      industry: "technology",
      yearsExperience: "10-15",
      leadershipLevel: "vp",
      organizationSize: "1000-5000",
      leadershipPriorities: ["innovation", "scaling", "talent-development"],
      leadershipChallenges: ["talent-retention", "technical-debt", "scaling-culture"],
      growthAreas: ["executive-presence", "board-communication"],
      networkingGoals: ["peers", "mentors", "cross-industry"],
      rechargeActivities: ["hiking", "reading", "cooking"],
      customInterests: ["open source", "AI ethics"],
      contentPreferences: ["podcasts", "technical-blogs"],
      fitnessActivities: ["yoga", "running"],
      idealWeekend: "outdoor-adventure",
      volunteerCauses: ["education", "stem-diversity"],
      energizers: ["solving-hard-problems", "mentoring", "deep-conversations"],
      leadershipPhilosophy: ["servant-leadership", "empowerment"],
      decisionMakingStyle: "collaborative",
      failureApproach: "learn-and-iterate",
      relationshipValues: ["authenticity", "trust", "growth-mindset"],
      communicationStyle: "direct",
      leadershipSeason: "scaling",
    },
  },
  {
    name: "Marcus Johnson",
    email: "marcus@example.com",
    position: "CEO",
    title: "Chief Executive Officer",
    company: "FinanceFlow",
    location: "New York, NY",
    responses: {
      industry: "finance",
      yearsExperience: "20+",
      leadershipLevel: "c-suite",
      organizationSize: "5000+",
      leadershipPriorities: ["digital-transformation", "culture", "profitability"],
      leadershipChallenges: ["digital-disruption", "regulatory-compliance", "change-management"],
      growthAreas: ["innovation-mindset", "technology-fluency"],
      networkingGoals: ["cross-industry", "thought-leaders"],
      rechargeActivities: ["golf", "reading", "travel"],
      customInterests: ["fintech disruption", "leadership philosophy"],
      contentPreferences: ["books", "executive-briefings"],
      fitnessActivities: ["tennis", "swimming"],
      idealWeekend: "cultural-exploration",
      volunteerCauses: ["financial-literacy", "mentorship-programs"],
      energizers: ["winning", "big-picture-strategy", "closing-deals"],
      leadershipPhilosophy: ["results-driven", "accountability"],
      decisionMakingStyle: "decisive",
      failureApproach: "fail-fast-pivot",
      relationshipValues: ["trust", "expertise", "reciprocity"],
      communicationStyle: "direct",
      leadershipSeason: "profitability",
    },
  },
  {
    name: "Elena Rodriguez",
    email: "elena@example.com",
    position: "Founder & CEO",
    title: "Healthcare Tech Innovator",
    company: "MedConnect AI",
    location: "Austin, TX",
    responses: {
      industry: "healthcare",
      yearsExperience: "6-10",
      leadershipLevel: "founder",
      organizationSize: "startup",
      leadershipPriorities: ["innovation", "fundraising", "product-market-fit"],
      leadershipChallenges: ["fundraising", "hiring", "work-life-balance"],
      growthAreas: ["fundraising", "scaling-operations"],
      networkingGoals: ["investors", "mentors", "co-founders"],
      rechargeActivities: ["hiking", "painting", "meditation"],
      customInterests: ["health equity", "AI in diagnostics"],
      contentPreferences: ["podcasts", "research-papers"],
      fitnessActivities: ["yoga", "cycling"],
      idealWeekend: "creative-projects",
      volunteerCauses: ["healthcare-access", "women-in-tech"],
      energizers: ["building-something-new", "impact", "deep-conversations"],
      leadershipPhilosophy: ["servant-leadership", "collaborative"],
      decisionMakingStyle: "data-driven",
      failureApproach: "learn-and-iterate",
      relationshipValues: ["authenticity", "shared-mission", "growth-mindset"],
      communicationStyle: "warm",
      leadershipSeason: "growth",
    },
  },
  {
    name: "David Park",
    email: "david@example.com",
    position: "Director of Strategy",
    title: "Strategic Advisor",
    company: "McKinsey & Company",
    location: "Chicago, IL",
    responses: {
      industry: "consulting",
      yearsExperience: "10-15",
      leadershipLevel: "director",
      organizationSize: "5000+",
      leadershipPriorities: ["mentoring", "culture", "client-impact"],
      leadershipChallenges: ["talent-retention", "burnout", "innovation-in-consulting"],
      growthAreas: ["executive-presence", "thought-leadership"],
      networkingGoals: ["peers", "cross-industry", "potential-clients"],
      rechargeActivities: ["cooking", "wine-tasting", "photography"],
      customInterests: ["organizational design", "behavioral economics"],
      contentPreferences: ["books", "case-studies"],
      fitnessActivities: ["CrossFit", "hiking"],
      idealWeekend: "food-and-friends",
      volunteerCauses: ["education", "economic-opportunity"],
      energizers: ["deep-conversations", "solving-hard-problems", "mentoring"],
      leadershipPhilosophy: ["servant-leadership", "coaching"],
      decisionMakingStyle: "collaborative",
      failureApproach: "root-cause-analysis",
      relationshipValues: ["trust", "authenticity", "expertise"],
      communicationStyle: "warm",
      leadershipSeason: "scaling",
    },
  },
  {
    name: "Priya Sharma",
    email: "priya@example.com",
    position: "CTO",
    title: "AI/ML Technology Leader",
    company: "NeuralScale",
    location: "Seattle, WA",
    responses: {
      industry: "technology",
      yearsExperience: "10-15",
      leadershipLevel: "c-suite",
      organizationSize: "50-200",
      leadershipPriorities: ["innovation", "talent-development", "technical-excellence"],
      leadershipChallenges: ["scaling-culture", "technical-debt", "hiring"],
      growthAreas: ["board-communication", "fundraising"],
      networkingGoals: ["peers", "mentors", "talent-pipeline"],
      rechargeActivities: ["reading", "gaming", "music"],
      customInterests: ["LLM architectures", "responsible AI"],
      contentPreferences: ["research-papers", "technical-blogs"],
      fitnessActivities: ["rock-climbing", "running"],
      idealWeekend: "tech-exploration",
      volunteerCauses: ["stem-diversity", "open-source"],
      energizers: ["solving-hard-problems", "building-something-new", "teaching"],
      leadershipPhilosophy: ["empowerment", "innovation-first"],
      decisionMakingStyle: "data-driven",
      failureApproach: "learn-and-iterate",
      relationshipValues: ["growth-mindset", "expertise", "authenticity"],
      communicationStyle: "data-first",
      leadershipSeason: "growth",
    },
  },
  {
    name: "James Wilson",
    email: "james@example.com",
    position: "VP Sales",
    title: "Revenue Leader",
    company: "CloudScale Enterprise",
    location: "Denver, CO",
    responses: {
      industry: "technology",
      yearsExperience: "15-20",
      leadershipLevel: "vp",
      organizationSize: "1000-5000",
      leadershipPriorities: ["revenue-growth", "team-building", "customer-success"],
      leadershipChallenges: ["market-competition", "sales-enablement", "forecasting"],
      growthAreas: ["strategic-thinking", "technology-fluency"],
      networkingGoals: ["peers", "potential-clients", "thought-leaders"],
      rechargeActivities: ["golf", "travel", "cooking"],
      customInterests: ["sales psychology", "enterprise go-to-market"],
      contentPreferences: ["podcasts", "books"],
      fitnessActivities: ["skiing", "CrossFit"],
      idealWeekend: "outdoor-adventure",
      volunteerCauses: ["youth-sports", "entrepreneurship"],
      energizers: ["winning", "closing-deals", "building-teams"],
      leadershipPhilosophy: ["results-driven", "accountability"],
      decisionMakingStyle: "decisive",
      failureApproach: "fail-fast-pivot",
      relationshipValues: ["trust", "reciprocity", "results"],
      communicationStyle: "direct",
      leadershipSeason: "scaling",
    },
  },
];

// ============================================
// Route Handler
// ============================================

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Seed endpoint is disabled in production." },
      { status: 403 }
    );
  }

  try {
    // Clear all stores (idempotent)
    users.clear();
    questionnaireResponses.clear();
    connections.clear();
    messages.clear();
    userMatches.clear();
    meetings.clear();
    notifications.clear();
    notificationPreferences.clear();

    const passwordHash = await hashPassword(SEED_PASSWORD);
    const now = new Date();
    const createdUsers: StoredUser[] = [];

    // ---- 1. Create users + questionnaire responses ----
    for (const seed of seedUsers) {
      const id = generateId();
      const user: StoredUser = {
        id,
        email: seed.email,
        passwordHash,
        name: seed.name,
        position: seed.position,
        title: seed.title,
        company: seed.company,
        location: seed.location,
        questionnaireCompleted: true,
        createdAt: now,
        updatedAt: now,
      };
      users.set(seed.email, user);
      createdUsers.push(user);

      questionnaireResponses.set(id, {
        userId: id,
        responses: seed.responses as Record<string, unknown>,
        completionPercentage: 100,
        completedAt: now,
        lastUpdated: now,
      });

      notificationPreferences.set(id, getDefaultPreferences(id));

      // Save to Supabase for persistence across server restarts
      if (isSupabaseConfigured && supabaseAdmin) {
        try {
          // First try to delete existing user with same email (for re-seeding)
          await supabaseAdmin
            .from('user_profiles')
            .delete()
            .eq('email', seed.email.toLowerCase());

          // Insert the user with password hash
          const { error } = await supabaseAdmin
            .from('user_profiles')
            .insert({
              id,
              user_id: id,
              email: seed.email.toLowerCase(),
              password_hash: passwordHash,
              name: seed.name,
              position: seed.position,
              title: seed.title,
              company: seed.company,
              location: seed.location,
              questionnaire_completed: true,
              questionnaire_data: seed.responses,
              is_active: true,
              is_visible: true,
              created_at: now.toISOString(),
              updated_at: now.toISOString(),
            } as never);

          if (error) {
            console.error(`Failed to save ${seed.email} to Supabase:`, error.message);
          } else {
            console.log(`✅ Saved ${seed.email} to Supabase with password hash`);
          }
        } catch (err) {
          console.error(`Supabase error for ${seed.email}:`, err);
        }
      }
    }

    // ---- 2. Compute matches for every user ----
    const usersWithResponses = createdUsers.map((u) => {
      const seed = seedUsers.find((s) => s.email === u.email)!;
      return {
        id: u.id,
        profile: {
          name: u.name,
          position: u.position,
          title: u.title,
          company: u.company,
        },
        responses: seed.responses,
      };
    });

    for (const uwr of usersWithResponses) {
      const matchList = generateMatches(uwr, usersWithResponses, {
        maxHighAffinityMatches: 3,
        maxStrategicMatches: 3,
      });
      userMatches.set(uwr.id, matchList);
    }

    // Helper to look up user by email
    const byEmail = (email: string) => createdUsers.find((u) => u.email === email)!;

    const sarah = byEmail("sarah@example.com");
    const marcus = byEmail("marcus@example.com");
    const elena = byEmail("elena@example.com");
    const david = byEmail("david@example.com");
    const priya = byEmail("priya@example.com");
    const james = byEmail("james@example.com");

    // ---- 3. Connections ----
    const conn1: Connection = {
      id: generateId(),
      requesterId: sarah.id,
      recipientId: marcus.id,
      status: "accepted",
      message: "Would love to discuss tech-finance crossover strategies!",
      createdAt: new Date(now.getTime() - 7 * 86400000),
      updatedAt: new Date(now.getTime() - 6 * 86400000),
    };

    const conn2: Connection = {
      id: generateId(),
      requesterId: elena.id,
      recipientId: sarah.id,
      status: "accepted",
      message: "Fellow servant-leader in tech — let's connect!",
      createdAt: new Date(now.getTime() - 5 * 86400000),
      updatedAt: new Date(now.getTime() - 4 * 86400000),
    };

    const conn3: Connection = {
      id: generateId(),
      requesterId: david.id,
      recipientId: priya.id,
      status: "pending",
      message: "Your work on responsible AI aligns with a strategy project I'm running.",
      createdAt: new Date(now.getTime() - 2 * 86400000),
      updatedAt: new Date(now.getTime() - 2 * 86400000),
    };

    const conn4: Connection = {
      id: generateId(),
      requesterId: james.id,
      recipientId: sarah.id,
      status: "pending",
      message: "Our companies are in adjacent spaces — could be a great partnership.",
      createdAt: new Date(now.getTime() - 1 * 86400000),
      updatedAt: new Date(now.getTime() - 1 * 86400000),
    };

    for (const c of [conn1, conn2, conn3, conn4]) {
      connections.set(c.id, c);
    }

    // ---- 4. Messages (on accepted connections) ----
    const sarahMarcusMsgs: Message[] = [
      {
        id: generateId(),
        connectionId: conn1.id,
        senderId: sarah.id,
        content: "Hey Marcus! Thanks for accepting. I've been thinking about how AI is reshaping financial services — would love to hear your perspective.",
        read: true,
        createdAt: new Date(now.getTime() - 6 * 86400000),
      },
      {
        id: generateId(),
        connectionId: conn1.id,
        senderId: marcus.id,
        content: "Great to connect, Sarah! We're actually exploring AI-driven risk modeling. Your engineering background would be invaluable for our approach.",
        read: true,
        createdAt: new Date(now.getTime() - 6 * 86400000 + 3600000),
      },
      {
        id: generateId(),
        connectionId: conn1.id,
        senderId: sarah.id,
        content: "That's exactly the kind of cross-pollination I was hoping for. We built something similar for fraud detection at TechCorp. Happy to share our learnings.",
        read: true,
        createdAt: new Date(now.getTime() - 5 * 86400000),
      },
      {
        id: generateId(),
        connectionId: conn1.id,
        senderId: marcus.id,
        content: "Would love that. Also, how are you handling the talent retention challenge? Finance is losing engineers to pure tech companies.",
        read: true,
        createdAt: new Date(now.getTime() - 4 * 86400000),
      },
      {
        id: generateId(),
        connectionId: conn1.id,
        senderId: sarah.id,
        content: "It's tough everywhere. We've had success with internal mobility programs and 20% time for innovation projects. Should we set up a proper meeting to dive deeper?",
        read: false,
        createdAt: new Date(now.getTime() - 2 * 86400000),
      },
    ];

    const elenaSarahMsgs: Message[] = [
      {
        id: generateId(),
        connectionId: conn2.id,
        senderId: elena.id,
        content: "Hi Sarah! I saw your work on scaling engineering teams. I'm at a critical inflection point with MedConnect AI — just closed our Series A.",
        read: true,
        createdAt: new Date(now.getTime() - 4 * 86400000),
      },
      {
        id: generateId(),
        connectionId: conn2.id,
        senderId: sarah.id,
        content: "Congrats on the Series A! That's a huge milestone. Healthcare AI is such a promising space. What's your biggest scaling challenge right now?",
        read: true,
        createdAt: new Date(now.getTime() - 3 * 86400000),
      },
      {
        id: generateId(),
        connectionId: conn2.id,
        senderId: elena.id,
        content: "Building the right team culture while hiring fast. We need to go from 15 to 40 engineers without losing the collaborative spirit that makes us special. Any advice?",
        read: false,
        createdAt: new Date(now.getTime() - 1 * 86400000),
      },
    ];

    messages.set(conn1.id, sarahMarcusMsgs);
    messages.set(conn2.id, elenaSarahMsgs);

    // ---- 5. Meetings ----
    const meeting1: Meeting = {
      id: generateId(),
      requesterId: sarah.id,
      recipientId: marcus.id,
      status: "scheduled",
      duration: 30,
      meetingType: "video",
      contextMessage: "Deep dive on AI in financial risk modeling and talent retention strategies.",
      proposedTimes: [
        new Date(now.getTime() + 3 * 86400000 + 14 * 3600000), // 3 days from now, 2pm
        new Date(now.getTime() + 4 * 86400000 + 10 * 3600000), // 4 days, 10am
      ],
      acceptedTime: new Date(now.getTime() + 3 * 86400000 + 14 * 3600000),
      meetingLink: "https://meet.google.com/abc-demo-xyz",
      remindersSent: { day_before: false, hour_before: false },
      createdAt: new Date(now.getTime() - 1 * 86400000),
      updatedAt: now,
    };

    const meeting2: Meeting = {
      id: generateId(),
      requesterId: elena.id,
      recipientId: david.id,
      status: "pending",
      duration: 45,
      meetingType: "coffee",
      contextMessage: "Would love to pick your brain on organizational design for scaling startups.",
      proposedTimes: [
        new Date(now.getTime() + 5 * 86400000 + 9 * 3600000),  // 5 days, 9am
        new Date(now.getTime() + 6 * 86400000 + 15 * 3600000), // 6 days, 3pm
      ],
      remindersSent: { day_before: false, hour_before: false },
      createdAt: new Date(now.getTime() - 12 * 3600000),
      updatedAt: new Date(now.getTime() - 12 * 3600000),
    };

    const meeting3: Meeting = {
      id: generateId(),
      requesterId: james.id,
      recipientId: priya.id,
      status: "pending",
      duration: 30,
      meetingType: "video",
      contextMessage: "Exploring how AI/ML capabilities could enhance our enterprise sales platform.",
      proposedTimes: [
        new Date(now.getTime() + 2 * 86400000 + 11 * 3600000), // 2 days, 11am
        new Date(now.getTime() + 3 * 86400000 + 16 * 3600000), // 3 days, 4pm
        new Date(now.getTime() + 5 * 86400000 + 10 * 3600000), // 5 days, 10am
      ],
      remindersSent: { day_before: false, hour_before: false },
      createdAt: new Date(now.getTime() - 6 * 3600000),
      updatedAt: new Date(now.getTime() - 6 * 3600000),
    };

    for (const m of [meeting1, meeting2, meeting3]) {
      meetings.set(m.id, m);
    }

    // ---- 6. Notifications ----
    const seedNotifications: Notification[] = [
      // Sarah — new match + connection request from James
      {
        id: generateId(),
        userId: sarah.id,
        type: "new_matches",
        title: "New matches found!",
        body: "We've found new high-affinity and strategic matches based on your profile.",
        read: false,
        createdAt: new Date(now.getTime() - 3 * 86400000),
      },
      {
        id: generateId(),
        userId: sarah.id,
        type: "connection_request",
        title: "New connection request",
        body: "James Wilson wants to connect with you.",
        data: { connectionId: conn4.id, fromUserId: james.id },
        read: false,
        createdAt: new Date(now.getTime() - 1 * 86400000),
      },
      // Marcus — meeting scheduled
      {
        id: generateId(),
        userId: marcus.id,
        type: "meeting_accepted",
        title: "Meeting scheduled",
        body: "Your meeting with Sarah Chen has been scheduled.",
        data: { meetingId: meeting1.id },
        read: true,
        createdAt: now,
      },
      // Elena — new matches
      {
        id: generateId(),
        userId: elena.id,
        type: "new_matches",
        title: "New matches found!",
        body: "We've found new connections that share your passion for healthcare innovation.",
        read: false,
        createdAt: new Date(now.getTime() - 2 * 86400000),
      },
      // David — connection request from David (sent) + meeting request from Elena
      {
        id: generateId(),
        userId: david.id,
        type: "meeting_request",
        title: "Meeting request",
        body: "Elena Rodriguez wants to meet for coffee.",
        data: { meetingId: meeting2.id, fromUserId: elena.id },
        read: false,
        createdAt: new Date(now.getTime() - 12 * 3600000),
      },
      // Priya — connection request + meeting request
      {
        id: generateId(),
        userId: priya.id,
        type: "connection_request",
        title: "New connection request",
        body: "David Park wants to connect with you.",
        data: { connectionId: conn3.id, fromUserId: david.id },
        read: false,
        createdAt: new Date(now.getTime() - 2 * 86400000),
      },
      {
        id: generateId(),
        userId: priya.id,
        type: "meeting_request",
        title: "Meeting request",
        body: "James Wilson wants to set up a video call.",
        data: { meetingId: meeting3.id, fromUserId: james.id },
        read: false,
        createdAt: new Date(now.getTime() - 6 * 3600000),
      },
      // James — new matches
      {
        id: generateId(),
        userId: james.id,
        type: "new_matches",
        title: "New matches found!",
        body: "Check out your latest strategic matches in the network.",
        read: true,
        createdAt: new Date(now.getTime() - 4 * 86400000),
      },
    ];

    for (const n of seedNotifications) {
      const existing = notifications.get(n.userId) || [];
      existing.push(n);
      notifications.set(n.userId, existing);
    }

    // ---- Build response ----
    const summary = createdUsers.map((u) => ({
      email: u.email,
      name: u.name,
      role: `${u.position} at ${u.company}`,
      id: u.id,
      matchCount: userMatches.get(u.id)?.length ?? 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        message: "Seed data created successfully",
        password: SEED_PASSWORD,
        users: summary,
        counts: {
          users: createdUsers.length,
          connections: connections.size,
          conversations: messages.size,
          meetings: meetings.size,
          notifications: seedNotifications.length,
        },
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
