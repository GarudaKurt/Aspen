import { NextResponse } from "next/server";
import { PHOTO_TYPES } from "@/features/business-photos/types";
import { z } from "zod";
import { createSupabasePublicClient, createSupabaseServerClient } from "@/lib/supabase/server-client";
import { createR2DownloadUrl, headR2Object } from "@/lib/r2/client";

export const runtime = "nodejs";

async function resolveStoredPhotoKey(objectKey: string, contentType: string) {
  // All correctly migrated optimized uploads already carry this suffix, so do
  // not add an extra R2 request to the normal image-rendering path.
  if (contentType !== "image/webp" || objectKey.endsWith(".webp")) return objectKey;
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

const assetId = z.string().uuid();
const noStore = { "Cache-Control": "private, no-store" };

async function findPhoto(client: Awaited<ReturnType<typeof createSupabasePublicClient>>, id: string) {
  const { data, error } = await client.from("media_assets")
    .select("object_key, content_type").eq("id", id)
    .eq("visibility", "public").eq("status", "active")
    .in("category", ["business_cover", "business_gallery", "service_photo"]).maybeSingle();
  if (error) throw error;
  return data;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const missing = () => new Response(null, { status: 404, headers: noStore });
  if (!assetId.safeParse(id).success) return missing();
  try {
    // Only the anonymous RLS result is eligible for browser reuse across accounts.
    const published = await findPhoto(await createSupabasePublicClient(), id);
    const photo = published ?? (request.headers.has("cookie")
      ? await findPhoto(await createSupabaseServerClient(), id) : null);
    if (!photo || !z.enum(PHOTO_TYPES).safeParse(photo.content_type).success) return missing();
    const objectKey = await resolveStoredPhotoKey(String(photo.object_key), String(photo.content_type));
    if (!objectKey) return missing();
    // The redirect expires before its signature. R2 receives the same cache policy.
    const cacheControl = published ? "private, max-age=240, must-revalidate" : "private, no-store";
    const response = NextResponse.redirect(await createR2DownloadUrl(objectKey, published ? 300 : 60, cacheControl));
    response.headers.set("Cache-Control", cacheControl);
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    return new Response(null, { status: 503, headers: noStore });
  }
}
