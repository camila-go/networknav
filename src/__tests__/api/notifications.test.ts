/** @vitest-environment node */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { notifications, notificationPreferences } from "@/lib/stores";

// Mock Supabase
vi.mock("@/lib/supabase/client", () => ({
  supabaseAdmin: null,
  isSupabaseConfigured: false,
}));

// Mock Socket.io
vi.mock("@/lib/socket", () => ({
  getSocketInstance: () => null,
}));

// Mock getSession
const mockSession = { userId: "user-1", email: "test@test.com", expiresAt: new Date(Date.now() + 3600000) };
vi.mock("@/lib/auth", () => ({
  getSession: vi.fn().mockResolvedValue(null),
}));

import { getSession } from "@/lib/auth";
import { GET, PATCH } from "@/app/api/notifications/route";
import { createNotification } from "@/lib/notifications/notification-service";

function createGetRequest(params?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/notifications");
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return new NextRequest(url, { method: "GET" });
}

function createPatchRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/notifications", {
    method: "PATCH",
    headers: new Headers({ "content-type": "application/json" }),
    body: JSON.stringify(body),
  });
}

describe("Notifications API Routes", () => {
  beforeEach(() => {
    notifications.clear();
    notificationPreferences.clear();
    vi.mocked(getSession).mockResolvedValue(null);
  });

  describe("GET /api/notifications", () => {
    it("should return 401 when not authenticated", async () => {
      const req = createGetRequest();
      const res = await GET(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
    });

    it("should return empty notifications for new user", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      const req = createGetRequest();
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.notifications).toEqual([]);
      expect(body.data.unreadCount).toBe(0);
    });

    it("should return notifications list", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      createNotification("user-1", "new_matches");
      createNotification("user-1", "connection_request", { senderName: "Jane" });

      const req = createGetRequest();
      const res = await GET(req);
      const body = await res.json();
      expect(body.data.notifications).toHaveLength(2);
      expect(body.data.unreadCount).toBe(2);
    });

    it("should return unread count when type=count", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      createNotification("user-1", "new_matches");
      createNotification("user-1", "new_message", { senderName: "Bob" });

      const req = createGetRequest({ type: "count" });
      const res = await GET(req);
      const body = await res.json();
      expect(body.data.unreadCount).toBe(2);
      expect(body.data.notifications).toBeUndefined();
    });

    it("should return preferences when type=preferences", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      const req = createGetRequest({ type: "preferences" });
      const res = await GET(req);
      const body = await res.json();
      expect(body.data.preferences).toBeDefined();
      expect(body.data.preferences).toHaveProperty("email");
      expect(body.data.preferences).toHaveProperty("inApp");
    });
  });

  describe("PATCH /api/notifications", () => {
    it("should return 401 when not authenticated", async () => {
      const req = createPatchRequest({ action: "markAllRead" });
      const res = await PATCH(req);
      expect(res.status).toBe(401);
    });

    it("should mark all notifications as read", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      createNotification("user-1", "new_matches");
      createNotification("user-1", "new_message", { senderName: "Bob" });

      const req = createPatchRequest({ action: "markAllRead" });
      const res = await PATCH(req);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.markedCount).toBe(2);
    });

    it("should update preferences", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      const req = createPatchRequest({
        action: "updatePreferences",
        preferences: { email: false, push: true },
      });
      const res = await PATCH(req);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.preferences.email).toBe(false);
      expect(body.data.preferences.push).toBe(true);
    });

    it("should return 400 for invalid action", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      const req = createPatchRequest({ action: "invalidAction" });
      const res = await PATCH(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Invalid action");
    });
  });
});
