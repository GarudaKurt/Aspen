import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createR2DownloadUrl, deleteR2Object, getR2PublicUrl, putR2Photo } from "@/lib/r2/client";
import { detectMediaType } from "@/features/media/validation";
import { BusinessPhotoValidationError, validateBusinessImageUpload } from "@/features/business-photos/validate";
import { MAX_PHOTO_BYTES, validateBusinessPhoto } from "@/features/business-photos/types";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { getCurrentProfile } from "@/server/auth/session";

export const runtime = "nodejs";
const inputSchema = z.object({ serviceId: z.string().uuid() });
const maxRequestBytes = MAX_PHOTO_BYTES + 32_768;

function failure(error: string, status = 400) { return NextResponse.json({ error }, { status }); }
class PhotoRequestTooLarge extends Error {}

async function readPhotoForm(request: Request) {
  let bytes = 0;
  const body = request.body?.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      bytes += chunk.byteLength;
      if (bytes > maxRequestBytes) throw new PhotoRequestTooLarge();
      controller.enqueue(chunk);
    },
  }));
  return new Response(body, { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return failure("Request origin is not allowed.", 403);
  if (Number(request.headers.get("content-length")) > maxRequestBytes) return failure("Each photo must be 4 MB or smaller.", 413);

  let objectKey: string | undefined;
  let committed = false;
  try {
    const form = await readPhotoForm(request);
    const parsed = inputSchema.safeParse({ serviceId: form.get("serviceId") });
    const file = form.get("file");
    if (!parsed.success || !(file instanceof File)) return failure("Invalid service photo request.");
    const invalid = validateBusinessPhoto(file);
    if (invalid) return failure(invalid);

    const current = await getCurrentProfile();
    if (!current?.user.email_confirmed_at || current.profile?.role !== "provider") {
      return failure("Sign in with the verified provider account that owns this service.", 403);
    }
    const supabase = await createSupabaseServerClient();
    const { data: service } = await supabase.from("business_services")
      .select("id, businesses!inner(owner_id, slug)")
      .eq("id", parsed.data.serviceId).eq("businesses.owner_id", current.user.id).maybeSingle();
    if (!service) return failure("Service not found or access denied.", 404);

    const { count } = await supabase.from("media_assets").select("id", { count: "exact", head: true })
      .eq("owner_id", current.user.id).gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
    if ((count ?? 0) >= 30) return failure("Too many uploads. Please wait before uploading more files.", 429);

    const source = new Uint8Array(await file.arrayBuffer());
    if (detectMediaType(source) !== file.type) return failure("The file contents do not match its image format.");
    const validated = await validateBusinessImageUpload(source, file.name, file.type);

    const assetId = crypto.randomUUID();
    objectKey = `services/${parsed.data.serviceId}/service_photo/${assetId}-photo${validated.extension}`;
    await putR2Photo(objectKey, source, validated.contentType);

    const { data: asset, error } = await supabase.from("media_assets").insert({
      id: assetId,
      owner_id: current.user.id,
      service_id: parsed.data.serviceId,
      category: "service_photo",
      visibility: "public",
      object_key: objectKey,
      original_filename: validated.filename,
      content_type: validated.contentType,
      byte_size: source.byteLength,
      status: "active",
      uploaded_at: new Date().toISOString(),
    }).select("id, object_key, category, visibility, content_type, byte_size, original_filename, status").single();
    if (error || !asset) throw new Error("Photo metadata could not be saved.");
    committed = true;

    const businesses = service.businesses as unknown as { slug?: string } | { slug?: string }[];
    const slug = Array.isArray(businesses) ? businesses[0]?.slug : businesses?.slug;
    revalidatePath("/tenant-dashboard/services");
    if (slug) revalidatePath(`/business-profile/${slug}`);
    return NextResponse.json({
      asset: {
        id: String(asset.id), objectKey: String(asset.object_key), category: "service_photo", visibility: "public",
        contentType: String(asset.content_type), byteSize: Number(asset.byte_size), originalFilename: String(asset.original_filename),
        status: "active", url: getR2PublicUrl(String(asset.object_key)) ?? await createR2DownloadUrl(String(asset.object_key)),
      },
    });
  } catch (cause) {
    if (objectKey && !committed) {
      try { await deleteR2Object(objectKey); } catch { console.warn("Unlinked service photo needs R2 cleanup."); }
    }
    if (cause instanceof PhotoRequestTooLarge) return failure("Each photo must be 4 MB or smaller.", 413);
    if (cause instanceof BusinessPhotoValidationError) return failure(cause.message);
    return failure("Unable to save the service photo. Check the R2 configuration and try again.", 503);
  }
}
