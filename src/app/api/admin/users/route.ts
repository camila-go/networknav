import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { users } from "@/lib/stores";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type { UserRole } from "@/types";
import { z } from "zod";

// GET /api/admin/users — list users with pagination, search, role filter
export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(50, parseInt(searchParams.get("pageSize") || "20"));
    const search = searchParams.get("search")?.toLowerCase() || "";
    const roleFilter = searchParams.get("role") || "";

    if (isSupabaseConfigured && supabaseAdmin) {
      let query = supabaseAdmin
        .from("user_profiles")
        .select("id, email, name, title, company, role, photo_url, questionnaire_completed, is_active, created_at", {
          count: "exact",
        });

      if (search) {
        query = query.or(
          `name.ilike.%${search}%,email.ilike.%${search}%`
        );
      }
      if (roleFilter) {
        query = query.eq("role", roleFilter);
      }

      const { data: rawData, count, error } = await query
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;

      const data = (rawData || []) as unknown as Array<{
        id: string; email: string; name: string;
        title: string; company: string; role: string; photo_url: string | null;
        questionnaire_completed: boolean; is_active: boolean; created_at: string;
      }>;

      return NextResponse.json({
        success: true,
        data: {
          items: data.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            title: u.title,
            company: u.company,
            role: u.role || "user",
            photoUrl: u.photo_url,
            questionnaireCompleted: u.questionnaire_completed,
            isActive: u.is_active,
            createdAt: u.created_at,
          })),
          total: count || 0,
          page,
          pageSize,
          hasMore: (count || 0) > page * pageSize,
        },
      });
    }

    // Fallback: in-memory store
    let allUsers = Array.from(users.values()).map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      title: u.title,
      company: u.company,
      role: (u.role || "user") as UserRole,
      photoUrl: u.photoUrl,
      questionnaireCompleted: u.questionnaireCompleted,
      isActive: true,
      createdAt: u.createdAt.toISOString(),
    }));

    if (search) {
      allUsers = allUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search)
      );
    }
    if (roleFilter) {
      allUsers = allUsers.filter((u) => u.role === roleFilter);
    }

    allUsers.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const total = allUsers.length;
    const items = allUsers.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json({
      success: true,
      data: { items, total, page, pageSize, hasMore: total > page * pageSize },
    });
  } catch (error) {
    console.error("Admin list users error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users — update user role
const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["user", "moderator", "admin"]),
});

export async function PATCH(request: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const result = updateRoleSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { userId, role } = result.data;

    // Prevent self-demotion
    if (userId === session.userId && role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Cannot change your own role" },
        { status: 400 }
      );
    }

    // Update in-memory store
    for (const [key, user] of users.entries()) {
      if (user.id === userId) {
        users.set(key, { ...user, role });
        break;
      }
    }

    // Update in Supabase
    if (isSupabaseConfigured && supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from("user_profiles")
        .update({ role } as never)
        .eq("id", userId);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin update role error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update role" },
      { status: 500 }
    );
  }
}
