import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";

const MAX_BYTES = 2_500_000;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const deviceId = cookies().get("device_id")?.value;
    const userId = session?.userId || deviceId;
    if (!userId) {
      return NextResponse.json({ error: "Sign in to upload" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Images only" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      return NextResponse.json({ error: "Image too large (max ~2.5MB)" }, { status: 400 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 80);
    const path = `${userId}/${Date.now()}-${safeName}`;

    if (isSupabaseConfigured && supabaseAdmin) {
      const { error } = await supabaseAdmin.storage
        .from("explore-feed")
        .upload(path, buf, {
          contentType: file.type,
          upsert: false,
        });
      if (!error) {
        const { data } = supabaseAdmin.storage.from("explore-feed").getPublicUrl(path);
        return NextResponse.json({ success: true, url: data.publicUrl });
      }
      console.warn("[explore/upload] Storage upload failed, using inline data URL:", error.message);
    }

    const b64 = buf.toString("base64");
    return NextResponse.json({
      success: true,
      url: `data:${file.type};base64,${b64}`,
    });
  } catch (e) {
    console.error("[explore/upload]", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
