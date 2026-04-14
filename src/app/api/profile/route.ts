import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { profileSchema } from "@/lib/validations";
import { users } from "@/lib/stores";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { cookies } from "next/headers";
import type { UserRole } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const cookieStore = cookies();
    const deviceId = cookieStore.get("device_id")?.value;
    
    const searchParams = request.nextUrl.searchParams;
    const targetUserId = searchParams.get("userId");
    
    // If no targetUserId, return current user's profile
    if (!targetUserId) {
      const currentUserId = session?.userId || deviceId;
      
      if (!currentUserId) {
        return NextResponse.json(
          { success: false, error: "Not authenticated" },
          { status: 401 }
        );
      }
      
      // Find user by ID in the users map
      let currentUser = null;
      for (const user of users.values()) {
        if (user.id === currentUserId) {
          currentUser = user;
          break;
        }
      }

      // Cold start / new instance: load from Supabase by profile id or session email
      if (!currentUser && session && isSupabaseConfigured && supabaseAdmin) {
        try {
          const { data: byId } = await supabaseAdmin
            .from("user_profiles")
            .select(
              "id, email, name, position, title, company, location, photo_url, bio"
            )
            .eq("id", currentUserId)
            .maybeSingle();
          const row = byId as {
            id: string;
            email: string;
            name?: string;
            position?: string;
            title?: string;
            company?: string;
            location?: string;
            photo_url?: string;
            bio?: string;
          } | null;
          if (row) {
            currentUser = {
              id: row.id,
              email: row.email,
              passwordHash: "",
              role: "user" as UserRole,
              name: row.name || "User",
              position: row.position || "",
              title: row.title || row.position || "",
              company: row.company || "",
              location: row.location,
              photoUrl: row.photo_url,
              bio: row.bio,
              questionnaireCompleted: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }
        } catch {
          // fall through
        }
      }

      if (!currentUser && session && isSupabaseConfigured && supabaseAdmin) {
        try {
          const { data: byEmail } = await supabaseAdmin
            .from("user_profiles")
            .select(
              "id, email, name, position, title, company, location, photo_url, bio"
            )
            .eq("email", session.email.toLowerCase())
            .maybeSingle();
          const row = byEmail as {
            id: string;
            email: string;
            name?: string;
            position?: string;
            title?: string;
            company?: string;
            location?: string;
            photo_url?: string;
            bio?: string;
          } | null;
          if (row) {
            currentUser = {
              id: row.id,
              email: row.email,
              passwordHash: "",
              role: "user" as UserRole,
              name: row.name || "User",
              position: row.position || "",
              title: row.title || row.position || "",
              company: row.company || "",
              location: row.location,
              photoUrl: row.photo_url,
              bio: row.bio,
              questionnaireCompleted: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }
        } catch {
          // fall through
        }
      }

      if (!currentUser) {
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: currentUser.id,
            email: currentUser.email,
            profile: {
              name: currentUser.name,
              position: currentUser.position,
              title: currentUser.title || currentUser.position,
              company: currentUser.company,
              location: currentUser.location,
              photoUrl: currentUser.photoUrl,
              bio: currentUser.bio,
            },
          },
        },
      });
    }
    
    // Fetch specific user by ID
    // First check in-memory store
    let targetUser = null;
    for (const user of users.values()) {
      if (user.id === targetUserId) {
        targetUser = user;
        break;
      }
    }
    
    // If not in memory, try Supabase
    if (!targetUser && isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data: supabaseUser, error } = await supabaseAdmin
          .from("user_profiles")
          .select("*")
          .eq("id", targetUserId)
          .maybeSingle();
        
        if (error) {
          console.error("Supabase query error:", error);
        } else if (supabaseUser) {
          targetUser = {
            id: supabaseUser.id,
            email: supabaseUser.email,
            name: supabaseUser.name,
            position: supabaseUser.position,
            title: supabaseUser.title || supabaseUser.position,
            company: supabaseUser.company,
            location: supabaseUser.location,
            photoUrl: supabaseUser.photo_url,
            bio: supabaseUser.bio,
          };
        }
      } catch (err) {
        console.error("Supabase user fetch error:", err);
      }
    }
    
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: targetUser.id,
          profile: {
            name: targetUser.name,
            position: targetUser.position,
            title: targetUser.title || targetUser.position,
            company: targetUser.company,
            location: targetUser.location,
            photoUrl: targetUser.photoUrl,
            bio: targetUser.bio,
          },
        },
      },
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const result = profileSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, position, title, company, location, photoUrl } = result.data;

    // Find and update user
    const user = users.get(session.email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    user.name = name;
    user.position = position ?? title;
    user.title = title;
    user.company = company ?? "";
    if (location !== undefined) user.location = location;
    if (photoUrl !== undefined) user.photoUrl = photoUrl;
    user.updatedAt = new Date();

    users.set(session.email, user);

    // Persist to Supabase if configured
    if (supabaseAdmin) {
      try {
        await supabaseAdmin
          .from("user_profiles")
          .update({
            name,
            position,
            title,
            company,
            location: location ?? null,
            photo_url: photoUrl ?? undefined,
            updated_at: user.updatedAt.toISOString(),
          })
          .eq("user_id", user.id);
      } catch (err) {
        console.error("Supabase profile sync error:", err);
        // Non-blocking — in-memory update already succeeded
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          profile: {
            name: user.name,
            position: user.position,
            title: user.title,
            company: user.company,
            location: user.location,
            photoUrl: user.photoUrl,
          },
        },
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

