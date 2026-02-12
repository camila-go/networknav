/** @vitest-environment node */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { connections, messages, users } from "@/lib/stores";
import type { Connection, Message } from "@/types";

// Mock Supabase
vi.mock("@/lib/supabase/client", () => ({
  supabaseAdmin: null,
  isSupabaseConfigured: false,
}));

// Mock getSession for authentication
const mockSession = { userId: "user-1", email: "test@test.com", expiresAt: new Date(Date.now() + 3600000) };
vi.mock("@/lib/auth", () => ({
  getSession: vi.fn().mockResolvedValue(null),
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
  createAccessToken: vi.fn(),
  createRefreshToken: vi.fn(),
}));

import { getSession } from "@/lib/auth";
import { GET, POST } from "@/app/api/messages/route";

function createGetRequest(params?: Record<string, string>, cookies?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/messages");
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  const headers = new Headers();
  if (cookies) {
    headers.set("cookie", Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; "));
  }
  return new NextRequest(url, { method: "GET", headers });
}

function createPostRequest(body: unknown, cookies?: Record<string, string>): NextRequest {
  const headers = new Headers({ "content-type": "application/json" });
  if (cookies) {
    headers.set("cookie", Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; "));
  }
  return new NextRequest("http://localhost:3000/api/messages", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("Messages API Routes", () => {
  beforeEach(() => {
    users.clear();
    connections.clear();
    messages.clear();
    vi.mocked(getSession).mockResolvedValue(null);
  });

  describe("GET /api/messages", () => {
    it("should return empty conversations when no userId", async () => {
      const req = createGetRequest();
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.conversations).toEqual([]);
    });

    it("should return 404 for non-existent connection", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      const req = createGetRequest({ connectionId: "nonexistent" });
      const res = await GET(req);
      expect(res.status).toBe(404);
    });

    it("should return 403 for unauthorized connection access", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      const conn: Connection = {
        id: "conn-1",
        requesterId: "other-user",
        recipientId: "another-user",
        status: "accepted",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      connections.set("conn-1", conn);

      const req = createGetRequest({ connectionId: "conn-1" });
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it("should return 403 for non-accepted connection", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      const conn: Connection = {
        id: "conn-1",
        requesterId: "user-1",
        recipientId: "user-2",
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      connections.set("conn-1", conn);

      const req = createGetRequest({ connectionId: "conn-1" });
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it("should return messages for valid connection", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      const conn: Connection = {
        id: "conn-1",
        requesterId: "user-1",
        recipientId: "user-2",
        status: "accepted",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      connections.set("conn-1", conn);

      const msgs: Message[] = [
        { id: "msg-1", connectionId: "conn-1", senderId: "user-2", content: "Hello", read: false, createdAt: new Date() },
      ];
      messages.set("conn-1", msgs);

      const req = createGetRequest({ connectionId: "conn-1" });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.messages).toHaveLength(1);
    });
  });

  describe("POST /api/messages", () => {
    it("should return 401 when not authenticated", async () => {
      const req = createPostRequest({ content: "Hello", connectionId: "conn-1" });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("should return 400 for invalid message content", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      const req = createPostRequest({ content: "", connectionId: "conn-1" });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("should create message for existing connection", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      const conn: Connection = {
        id: "conn-1",
        requesterId: "user-1",
        recipientId: "user-2",
        status: "accepted",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      connections.set("conn-1", conn);

      const req = createPostRequest({ content: "Hello there!", connectionId: "conn-1" });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.message.content).toBe("Hello there!");
      expect(body.data.message.senderId).toBe("user-1");
    });

    it("should auto-create connection with targetUserId", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      const req = createPostRequest({ content: "Hey!", targetUserId: "user-2" });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.connectionId).toBeDefined();

      // Verify connection was created
      const conn = connections.get(body.data.connectionId);
      expect(conn).toBeDefined();
      expect(conn?.status).toBe("accepted");
    });

    it("should return 404 for non-existent connection without targetUserId", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      const req = createPostRequest({ content: "Hello", connectionId: "nonexistent" });
      const res = await POST(req);
      expect(res.status).toBe(404);
    });
  });
});
