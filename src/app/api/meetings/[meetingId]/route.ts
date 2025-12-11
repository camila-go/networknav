import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { meetings, users } from "@/lib/stores";
import { cookies } from "next/headers";
import type { PublicUser, MeetingStatus } from "@/types";

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

// GET - Get single meeting details
export async function GET(
  request: NextRequest,
  { params }: { params: { meetingId: string } }
) {
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

    const meeting = meetings.get(params.meetingId);
    if (!meeting) {
      return NextResponse.json(
        { success: false, error: "Meeting not found" },
        { status: 404 }
      );
    }

    // Check user is part of this meeting
    if (meeting.requesterId !== currentUserId && meeting.recipientId !== currentUserId) {
      return NextResponse.json(
        { success: false, error: "Not authorized" },
        { status: 403 }
      );
    }

    const requester = getUserById(meeting.requesterId);
    const recipient = getUserById(meeting.recipientId);

    return NextResponse.json({
      success: true,
      data: {
        ...meeting,
        requester,
        recipient,
      },
    });
  } catch (error) {
    console.error("Get meeting error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// PATCH - Update meeting (accept, decline, reschedule, cancel)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { meetingId: string } }
) {
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

    const meeting = meetings.get(params.meetingId);
    if (!meeting) {
      return NextResponse.json(
        { success: false, error: "Meeting not found" },
        { status: 404 }
      );
    }

    // Check user is part of this meeting
    if (meeting.requesterId !== currentUserId && meeting.recipientId !== currentUserId) {
      return NextResponse.json(
        { success: false, error: "Not authorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, acceptedTime, newProposedTimes } = body as {
      action: "accept" | "decline" | "reschedule" | "cancel" | "complete";
      acceptedTime?: string;
      newProposedTimes?: string[];
    };

    const isRecipient = meeting.recipientId === currentUserId;
    const isRequester = meeting.requesterId === currentUserId;

    let newStatus: MeetingStatus = meeting.status;
    let message = "";

    switch (action) {
      case "accept":
        if (!isRecipient) {
          return NextResponse.json(
            { success: false, error: "Only the recipient can accept a meeting request" },
            { status: 403 }
          );
        }
        if (meeting.status !== "pending") {
          return NextResponse.json(
            { success: false, error: "This meeting request is no longer pending" },
            { status: 400 }
          );
        }
        if (!acceptedTime) {
          return NextResponse.json(
            { success: false, error: "Please select a time to accept the meeting" },
            { status: 400 }
          );
        }
        newStatus = "scheduled";
        meeting.acceptedTime = new Date(acceptedTime);
        // In production: Generate meeting link based on calendar platform
        meeting.meetingLink = `https://meet.example.com/${meeting.id}`;
        message = "Meeting accepted and scheduled";
        break;

      case "decline":
        if (!isRecipient) {
          return NextResponse.json(
            { success: false, error: "Only the recipient can decline a meeting request" },
            { status: 403 }
          );
        }
        if (meeting.status !== "pending") {
          return NextResponse.json(
            { success: false, error: "This meeting request is no longer pending" },
            { status: 400 }
          );
        }
        newStatus = "declined";
        message = "Meeting request declined";
        break;

      case "reschedule":
        if (meeting.status !== "pending" && meeting.status !== "scheduled") {
          return NextResponse.json(
            { success: false, error: "Cannot reschedule this meeting" },
            { status: 400 }
          );
        }
        if (!newProposedTimes || newProposedTimes.length === 0) {
          return NextResponse.json(
            { success: false, error: "Please propose new times" },
            { status: 400 }
          );
        }
        newStatus = "rescheduled";
        meeting.proposedTimes = newProposedTimes.map(t => new Date(t));
        meeting.acceptedTime = undefined;
        // After reschedule, it goes back to pending for the other party to accept
        newStatus = "pending";
        // Swap who needs to respond
        if (isRecipient) {
          // Recipient proposed new times, requester needs to respond
          message = "New times proposed. Waiting for response.";
        } else {
          // Requester proposed new times, recipient needs to respond
          message = "New times proposed. Waiting for response.";
        }
        break;

      case "cancel":
        if (meeting.status === "completed" || meeting.status === "cancelled" || meeting.status === "declined") {
          return NextResponse.json(
            { success: false, error: "Cannot cancel this meeting" },
            { status: 400 }
          );
        }
        newStatus = "cancelled";
        message = "Meeting cancelled";
        break;

      case "complete":
        if (meeting.status !== "scheduled") {
          return NextResponse.json(
            { success: false, error: "Only scheduled meetings can be marked as complete" },
            { status: 400 }
          );
        }
        newStatus = "completed";
        message = "Meeting marked as complete";
        break;

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }

    meeting.status = newStatus;
    meeting.updatedAt = new Date();
    meetings.set(params.meetingId, meeting);

    const requester = getUserById(meeting.requesterId);
    const recipient = getUserById(meeting.recipientId);

    return NextResponse.json({
      success: true,
      data: {
        meeting: {
          ...meeting,
          requester,
          recipient,
        },
        message,
      },
    });
  } catch (error) {
    console.error("Update meeting error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

