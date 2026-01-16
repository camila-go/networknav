import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { meetings, users } from "@/lib/stores";
import { cookies } from "next/headers";
import type { Meeting, MeetingWithUsers, PublicUser } from "@/types";
import { checkRateLimit } from "@/lib/security/rateLimit";

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

// GET - Fetch meetings for current user
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all"; // "all", "upcoming", "past", "requests"

    const userMeetings: MeetingWithUsers[] = [];
    const now = new Date();

    for (const [, meeting] of meetings.entries()) {
      if (meeting.requesterId !== currentUserId && meeting.recipientId !== currentUserId) {
        continue;
      }

      const requester = getUserById(meeting.requesterId);
      const recipient = getUserById(meeting.recipientId);

      if (!requester || !recipient) continue;

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

    // Calculate stats
    const stats = {
      pending: Array.from(meetings.values()).filter(
        m => (m.requesterId === currentUserId || m.recipientId === currentUserId) && m.status === "pending"
      ).length,
      upcoming: Array.from(meetings.values()).filter(
        m => (m.requesterId === currentUserId || m.recipientId === currentUserId) && m.status === "scheduled" && m.acceptedTime && new Date(m.acceptedTime) > now
      ).length,
      completed: Array.from(meetings.values()).filter(
        m => (m.requesterId === currentUserId || m.recipientId === currentUserId) && m.status === "completed"
      ).length,
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

    meetings.set(meeting.id, meeting);

    // Get user details for response
    const requester = getUserById(currentUserId);
    const recipient = getUserById(recipientId);

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

