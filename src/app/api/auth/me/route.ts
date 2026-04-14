import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { users } from "@/lib/stores";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type { UserRole } from "@/types";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    // Find user by email from in-memory store
    let user = users.get(session.email);

    // Fallback to Supabase on cold start / different serverless instance
    if (!user && isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .eq('email', session.email.toLowerCase())
          .single();

        if (profile) {
          const p = profile as {
            id: string; email: string; password_hash?: string; role?: string;
            name?: string; title?: string; company?: string;
            location?: string; photo_url?: string; bio?: string;
            questionnaire_completed?: boolean;
          };
          const storedUser = {
            id: p.id,
            email: p.email,
            passwordHash: p.password_hash || '',
            role: (p.role as UserRole) || 'user',
            name: p.name || 'User',
            title: p.title || '',
            company: p.company || '',
            location: p.location,
            photoUrl: p.photo_url,
            bio: p.bio,
            questionnaireCompleted: p.questionnaire_completed || false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          users.set(session.email.toLowerCase(), storedUser);
          user = storedUser;
        }
      } catch {
        // Non-fatal: fall through to 404
      }
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role || 'user',
          profile: {
            name: user.name,
            title: user.title,
            company: user.company,
            location: user.location ?? "",
            photoUrl: user.photoUrl ?? "",
            bio: user.bio ?? "",
          },
          questionnaireCompleted: user.questionnaireCompleted,
        },
      },
    });
  } catch (error) {
    console.error("Get session error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

