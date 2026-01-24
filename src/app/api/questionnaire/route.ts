import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { questionnaireResponseSchema } from "@/lib/validations";
import { users, questionnaireResponses } from "@/lib/stores";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { generateEmbedding, createProfileText, isOpenAIConfigured } from "@/lib/ai/embeddings";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    // For demo: allow anonymous submissions with a device ID
    const deviceId = request.cookies.get("device_id")?.value || crypto.randomUUID();
    const userId = session?.userId || `demo_${deviceId}`;
    const userEmail = session?.email || `demo_${deviceId}@jynx.demo`;

    const body = await request.json();
    const { responses } = body;

    // Validate responses
    const result = questionnaireResponseSchema.safeParse(responses);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid questionnaire data",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Calculate completion percentage
    const requiredFields = [
      "industry",
      "yearsExperience",
      "leadershipLevel",
      "organizationSize",
      "leadershipPriorities",
      "leadershipChallenges",
      "growthAreas",
      "networkingGoals",
      "rechargeActivities",
      "contentPreferences",
      "idealWeekend",
      "energizers",
      "leadershipPhilosophy",
      "decisionMakingStyle",
      "failureApproach",
      "relationshipValues",
      "communicationStyle",
    ];

    const answeredRequired = requiredFields.filter((field) => {
      const value = result.data[field as keyof typeof result.data];
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== "";
    });

    const completionPercentage = Math.round(
      (answeredRequired.length / requiredFields.length) * 100
    );

    // Store questionnaire response in memory
    const now = new Date();
    questionnaireResponses.set(userId, {
      userId: userId,
      responses: result.data,
      completionPercentage,
      completedAt: completionPercentage >= 100 ? now : undefined,
      lastUpdated: now,
    });

    // Update user's questionnaire status if authenticated
    if (session) {
      const user = users.get(session.email);
      if (user && completionPercentage >= 80) {
        user.questionnaireCompleted = true;
        user.updatedAt = now;
      }
    }

    // Sync to Supabase if configured
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        // Get user profile from memory for additional data
        const memoryUser = session ? users.get(session.email) : null;
        
        // Build interests array from questionnaire
        const interests = [
          ...(result.data.rechargeActivities || []),
          ...(result.data.customInterests || []),
        ];

        // Generate AI embedding if OpenAI is configured
        let embedding: number[] | null = null;
        if (isOpenAIConfigured) {
          try {
            const profileText = createProfileText({
              name: memoryUser?.name,
              position: memoryUser?.position,
              title: memoryUser?.title,
              company: memoryUser?.company,
              interests,
              questionnaireData: result.data as Record<string, unknown>,
            });
            embedding = await generateEmbedding(profileText);
          } catch (embeddingError) {
            console.warn('Embedding generation failed:', embeddingError);
          }
        }

        // Prepare update data
        const updateData: Record<string, unknown> = {
          questionnaire_data: result.data,
          questionnaire_completed: completionPercentage >= 80,
          interests,
          updated_at: now.toISOString(),
        };

        if (embedding) {
          updateData.profile_embedding = embedding;
        }

        // First try to update existing profile (don't overwrite user data with defaults)
        const { error: updateError, count } = await supabaseAdmin
          .from('user_profiles')
          .update(updateData as never)
          .eq('id', userId)
          .select('id', { count: 'exact', head: true });

        // If no row was updated (user doesn't exist in Supabase), create a new one
        if (updateError || count === 0) {
          // Only insert new profile for demo users or if profile doesn't exist
          const insertData = {
            id: userId,
            user_id: userId,
            email: userEmail,
            name: memoryUser?.name || 'User',
            position: memoryUser?.position || null,
            title: memoryUser?.title || null,
            company: memoryUser?.company || null,
            is_active: true,
            is_visible: true,
            ...updateData,
          };
          
          const { error: insertError } = await supabaseAdmin
            .from('user_profiles')
            .insert(insertData as never);
          
          if (insertError && !insertError.message?.includes('duplicate')) {
            console.error('Supabase insert error:', insertError);
          }
        }

        console.log('✅ Questionnaire synced to Supabase:', userId, 'completed:', completionPercentage >= 80);
      } catch (supabaseError) {
        console.error('Supabase sync error (non-blocking):', supabaseError);
      }
    }

    // Set device ID cookie for demo users
    const response = NextResponse.json({
      success: true,
      data: {
        completionPercentage,
        message:
          completionPercentage >= 100
            ? "Questionnaire completed successfully!"
            : "Progress saved successfully",
      },
    });

    // Set device ID cookie if not authenticated
    if (!session) {
      response.cookies.set("device_id", deviceId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }

    return response;
  } catch (error) {
    console.error("Questionnaire save error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const deviceId = request.cookies.get("device_id")?.value;
    const userId = session?.userId || (deviceId ? `demo_${deviceId}` : null);

    if (!userId) {
      return NextResponse.json({
        success: true,
        data: {
          responses: {},
          completionPercentage: 0,
          completedAt: null,
        },
      });
    }

    const storedResponse = questionnaireResponses.get(userId);

    if (!storedResponse) {
      return NextResponse.json({
        success: true,
        data: {
          responses: {},
          completionPercentage: 0,
          completedAt: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        responses: storedResponse.responses,
        completionPercentage: storedResponse.completionPercentage,
        completedAt: storedResponse.completedAt,
      },
    });
  } catch (error) {
    console.error("Questionnaire fetch error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}


