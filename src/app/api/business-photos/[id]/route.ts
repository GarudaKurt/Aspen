import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { createR2DownloadUrl, headR2Object } from "@/lib/r2/client";

export const runtime = "nodejs";

async function resolveStoredPhotoKey(objectKey: string, contentType: string) {
  // All correctly migrated optimized uploads already carry this suffix, so do
  // not add an extra R2 request to the normal image-rendering path.
  if (objectKey.endsWith(".webp")) return objectKey;
  try {
    await headR2Object(objectKey);
    return objectKey;
  } catch {
    // 0027 makes new metadata keys end in .webp. This fallback renders the
    // short period of uploads made after conversion was deployed but before
    // that migration was applied, without exposing any non-public object.
    if (contentType === "image/webp" && !objectKey.endsWith(".webp")) {
      const webpKey = `${objectKey}.webp`;
      try {
        await headR2Object(webpKey);
        return webpKey;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new Response(null, { status: 404 });
  try {
    const supabase = await createSupabaseServerClient();
    // RLS allows published businesses, their owner, and administrators only.
    const { data } = await supabase.from("media_assets")
      .select("object_key, content_type, businesses!inner(id)").eq("id", id)
      .eq("visibility", "public").eq("status", "active")
      .in("category", ["business_cover", "business_gallery"]).maybeSingle();
    if (!data) return new Response(null, { status: 404 });
    const objectKey = await resolveStoredPhotoKey(String(data.object_key), String(data.content_type));
    if (!objectKey) return new Response(null, { status: 404 });
    const response = NextResponse.redirect(await createR2DownloadUrl(objectKey, 60));
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    return new Response(null, { status: 503 });
  }
}
