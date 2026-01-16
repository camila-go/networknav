import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { meetings, users } from "@/lib/stores";
import { cookies } from "next/headers";
import type { Meeting, MeetingWithUsers, PublicUser } from "@/types";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { notifyMeetingRequest } from "@/lib/notifications/notification-service";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";

// Helper to get user profile by ID
function getUserById(userId: string): PublicUser | null {
  for (const [, user] of users.entries()) {
    if (user.id === userId) {
      return {
        id: user.id,
        profile: {
          name: user.name,
          position: user.position,
          title: user.title,
          company: user.company,
          photoUrl: user.photoUrl,
          location: user.location,
        },
        questionnaireCompleted: user.questionnaireCompleted,
      };
    }
  }
  // Return demo user data if not found in users store
  return getDemoUser(userId);
}

function getDemoUser(userId: string): PublicUser | null {
  const demoUsers: Record<string, PublicUser> = {
    "demo-sarah": { id: "demo-sarah", profile: { name: "Sarah Chen", position: "VP of Engineering", title: "Engineering Leader", company: "TechCorp" }, questionnaireCompleted: true },
    "demo-marcus": { id: "demo-marcus", profile: { name: "Marcus Johnson", position: "Chief People Officer", title: "HR Executive", company: "GrowthStartup" }, questionnaireCompleted: true },
    "demo-elena": { id: "demo-elena", profile: { name: "Elena Rodriguez", position: "CEO", title: "Founder & CEO", company: "InnovateCo" }, questionnaireCompleted: true },
    "demo-david": { id: "demo-david", profile: { name: "David Park", position: "VP of Product", title: "Product Leader", company: "ScaleUp Inc" }, questionnaireCompleted: true },
    "demo-aisha": { id: "demo-aisha", profile: { name: "Aisha Patel", position: "CTO", title: "Technology Executive", company: "FinanceFlow" }, questionnaireCompleted: true },
    "demo-james": { id: "demo-james", profile: { name: "James Wilson", position: "Director of Operations", title: "Operations Leader", company: "LogiTech Solutions" }, questionnaireCompleted: true },
    "demo-lisa": { id: "demo-lisa", profile: { name: "Lisa Thompson", position: "Senior Manager", title: "Marketing Leader", company: "BrandCo" }, questionnaireCompleted: true },
    "demo-michael": { id: "demo-michael", profile: { name: "Michael Brown", position: "SVP Sales", title: "Sales Executive", company: "EnterpriseNow" }, questionnaireCompleted: true },
  };
  return demoUsers[userId] || null;
}

// Get user from Supabase by ID
async function getUserFromSupabase(userId: string): Promise<PublicUser | null> {
  if (!isSupabaseConfigured || !supabaseAdmin) return null;
  
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id, name, position, title, company, photo_url, location, questionnaire_completed')
    .eq('id', userId)
    .single();
  
  if (error || !data) return null;
  
  // Type assertion for Supabase response
  const row = data as {
    id: string;
    name: string;
    position?: string;
    title?: string;
    company?: string;
    photo_url?: string;
    location?: string;
    questionnaire_completed?: boolean;
  };
  
  return {
    id: row.id,
    profile: {
      name: row.name,
      position: row.position || '',
      title: row.title || '',
      company: row.company,
      photoUrl: row.photo_url,
      location: row.location,
    },
    questionnaireCompleted: row.questionnaire_completed || false,
  };
}

// Type for Supabase meeting request row
interface MeetingRequestRow {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: string;
  meeting_type: string;
  duration: number;
  context_message: string | null;
  proposed_times: string[];
  accepted_time: string | null;
  meeting_link: string | null;
  created_at: string;
  updated_at: string;
}

// Load meetings from Supabase
async function loadMeetingsFromSupabase(userId: string): Promise<Meeting[]> {
  if (!isSupabaseConfigured || !supabaseAdmin) return [];
  
  const { data, error } = await supabaseAdmin
    .from('meeting_requests')
    .select('*')
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('[Meetings API] Supabase load error:', error);
    return [];
  }
  
  return ((data || []) as MeetingRequestRow[]).map(row => ({
    id: row.id,
    requesterId: row.requester_id,
    recipientId: row.recipient_id,
    status: row.status as Meeting['status'],
    duration: row.duration,
    meetingType: row.meeting_type as Meeting['meetingType'],
    contextMessage: row.context_message || undefined,
    proposedTimes: (row.proposed_times || []).map((t: string) => new Date(t)),
    acceptedTime: row.accepted_time ? new Date(row.accepted_time) : undefined,
    meetingLink: row.meeting_link || undefined,
    remindersSent: { day_before: false, hour_before: false },
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));
}

// Save meeting to Supabase
async function saveMeetingToSupabase(meeting: Meeting): Promise<boolean> {
  if (!isSupabaseConfigured || !supabaseAdmin) return false;
  
  const { error } = await supabaseAdmin
    .from('meeting_requests')
    .upsert({
      id: meeting.id,
      requester_id: meeting.requesterId,
      recipient_id: meeting.recipientId,
      status: meeting.status,
      meeting_type: meeting.meetingType,
      duration: meeting.duration,
      context_message: meeting.contextMessage || null,
      proposed_times: meeting.proposedTimes.map(t => t.toISOString()),
      accepted_time: meeting.acceptedTime?.toISOString() || null,
      meeting_link: meeting.meetingLink || null,
      created_at: meeting.createdAt.toISOString(),
      updated_at: meeting.updatedAt.toISOString(),
    } as never, { onConflict: 'id' });
  
  if (error) {
    console.error('[Meetings API] Supabase save error:', error);
    return false;
  }
  
  console.log('[Meetings API] Meeting saved to Supabase:', meeting.id);
  return true;
}

// GET - Fetch meetings for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const cookieStore = cookies();
    const deviceId = cookieStore.get("device_id")?.value;

    const currentUserId = session?.userId || deviceId;
    
    console.log("[Meetings API] GET request:", {
      sessionUserId: session?.userId,
      deviceId,
      currentUserId,
    });

    if (!currentUserId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all"; // "all", "upcoming", "past", "requests"

    // Load meetings from Supabase first, then fallback to in-memory
    let allMeetings: Meeting[] = await loadMeetingsFromSupabase(currentUserId);
    
    // Also include in-memory meetings (merge)
    for (const [, meeting] of meetings.entries()) {
      if ((meeting.requesterId === currentUserId || meeting.recipientId === currentUserId) &&
          !allMeetings.find(m => m.id === meeting.id)) {
        allMeetings.push(meeting);
      }
    }

    console.log("[Meetings API] Total meetings found:", allMeetings.length);

    const userMeetings: MeetingWithUsers[] = [];
    const now = new Date();

    for (const meeting of allMeetings) {
      // Get user details - try Supabase first, then in-memory, then demo
      let requester = getUserById(meeting.requesterId) || await getUserFromSupabase(meeting.requesterId);
      let recipient = getUserById(meeting.recipientId) || await getUserFromSupabase(meeting.recipientId);

      if (!requester || !recipient) {
        console.log("[Meetings API] Skipping meeting - missing user data:", {
          meetingId: meeting.id,
          requesterFound: !!requester,
          recipientFound: !!recipient,
        });
        continue;
      }

      const meetingWithUsers: MeetingWithUsers = {
        ...meeting,
        requester,
        recipient,
      };

      // Apply filter
      switch (filter) {
        case "upcoming":
          if (meeting.status === "scheduled" && meeting.acceptedTime && new Date(meeting.acceptedTime) > now) {
            userMeetings.push(meetingWithUsers);
          }
          break;
        case "past":
          if (meeting.status === "completed" || (meeting.acceptedTime && new Date(meeting.acceptedTime) < now)) {
            userMeetings.push(meetingWithUsers);
          }
          break;
        case "requests":
          if (meeting.status === "pending") {
            userMeetings.push(meetingWithUsers);
          }
          break;
        default:
          userMeetings.push(meetingWithUsers);
      }
    }

    // Sort by date (upcoming first, then by created date)
    userMeetings.sort((a, b) => {
      if (a.acceptedTime && b.acceptedTime) {
        return new Date(a.acceptedTime).getTime() - new Date(b.acceptedTime).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Calculate stats from all meetings
    const stats = {
      pending: allMeetings.filter(m => m.status === "pending").length,
      upcoming: allMeetings.filter(
        m => m.status === "scheduled" && m.acceptedTime && new Date(m.acceptedTime) > now
      ).length,
      completed: allMeetings.filter(m => m.status === "completed").length,
    };

    return NextResponse.json({
      success: true,
      data: {
        meetings: userMeetings,
        stats,
      },
    });
  } catch (error) {
    console.error("Get meetings error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// POST - Create a new meeting request
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const cookieStore = cookies();
    const deviceId = cookieStore.get("device_id")?.value;

    const currentUserId = session?.userId || deviceId;
    if (!currentUserId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Rate limit meeting requests
    const rateLimitResult = await checkRateLimit(currentUserId, "schedule-meeting");
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "You've sent too many meeting requests. Please try again later.",
          retryAfter: rateLimitResult.resetTime 
            ? Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
            : 3600,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      recipientId,
      duration,
      meetingType,
      contextMessage,
      proposedTimes,
    } = body as {
      recipientId: string;
      duration: number;
      meetingType: "video" | "coffee" | "conference" | "phone";
      contextMessage?: string;
      proposedTimes: string[];
    };

    // Validate required fields
    if (!recipientId || !duration || !meetingType || !proposedTimes || proposedTimes.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if trying to schedule with yourself
    if (recipientId === currentUserId) {
      return NextResponse.json(
        { success: false, error: "Cannot schedule a meeting with yourself" },
        { status: 400 }
      );
    }

    // Check for existing pending meeting request
    const existingMeeting = Array.from(meetings.values()).find(
      m => m.requesterId === currentUserId && m.recipientId === recipientId && m.status === "pending"
    );
    if (existingMeeting) {
      return NextResponse.json(
        { success: false, error: "You already have a pending meeting request with this person" },
        { status: 400 }
      );
    }

    // Create meeting
    const meeting: Meeting = {
      id: `mtg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      requesterId: currentUserId,
      recipientId,
      status: "pending",
      duration,
      meetingType,
      contextMessage,
      proposedTimes: proposedTimes.map(t => new Date(t)),
      remindersSent: {
        day_before: false,
        hour_before: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to in-memory store
    meetings.set(meeting.id, meeting);

    // Save to Supabase (primary storage)
    const savedToSupabase = await saveMeetingToSupabase(meeting);

    console.log("[Meetings API] Meeting created:", {
      id: meeting.id,
      requesterId: meeting.requesterId,
      recipientId: meeting.recipientId,
      status: meeting.status,
      savedToSupabase,
    });

    // Get user details for response
    const requester = getUserById(currentUserId) || await getUserFromSupabase(currentUserId);
    const recipient = getUserById(recipientId) || await getUserFromSupabase(recipientId);

    // Send notification to recipient
    if (requester && recipient) {
      notifyMeetingRequest(
        recipientId,
        requester.profile.name,
        requester.profile.company,
        meetingType
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        meeting: {
          ...meeting,
          requester,
          recipient,
        },
        message: "Meeting request sent successfully",
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Create meeting error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

