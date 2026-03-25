import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { users } from "@/lib/stores";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { hashPassword } from "@/lib/auth";

// DELETE /api/admin/users/[userId] — delete user account
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { userId } = await params;

  // Prevent self-deletion
  if (userId === session.userId) {
    return NextResponse.json(
      { success: false, error: "Cannot delete your own account" },
      { status: 400 }
    );
  }

  try {
    // Remove from in-memory store
    for (const [key, user] of users.entries()) {
      if (user.id === userId) {
        users.delete(key);
        break;
      }
    }

    // Remove from Supabase (CASCADE will handle related data)
    if (isSupabaseConfigured && supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from("user_profiles")
        .delete()
        .eq("id", userId);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete user error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete user" },
      { status: 500 }
    );
  }
}

// POST /api/admin/users/[userId] — reset password
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { userId } = await params;

  try {
    // Generate a temporary password
    const tempChars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let tempPassword = "";
    for (let i = 0; i < 12; i++) {
      tempPassword += tempChars.charAt(Math.floor(Math.random() * tempChars.length));
    }
    // Ensure it meets password requirements
    tempPassword = "T" + tempPassword.slice(1, 11) + "1";

    const newHash = await hashPassword(tempPassword);

    // Update in-memory store
    for (const [key, user] of users.entries()) {
      if (user.id === userId) {
        users.set(key, { ...user, passwordHash: newHash });
        break;
      }
    }

    // Update in Supabase
    if (isSupabaseConfigured && supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from("user_profiles")
        .update({ password_hash: newHash } as never)
        .eq("id", userId);
      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      data: { temporaryPassword: tempPassword },
    });
  } catch (error) {
    console.error("Admin reset password error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
