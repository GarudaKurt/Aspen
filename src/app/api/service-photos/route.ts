import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createR2DownloadUrl, deleteR2Object, getR2PublicUrl, putR2Photo } from "@/lib/r2/client";
import { detectMediaType } from "@/features/media/validation";
import { BusinessPhotoValidationError, validateBusinessImageUpload } from "@/features/business-photos/validate";
import { MAX_PROXY_PHOTO_BYTES as MAX_PHOTO_BYTES, validateBusinessPhoto } from "@/features/business-photos/types";
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
  let stage = "request";
  const requestId = crypto.randomUUID();
  try {
    const form = await readPhotoForm(request);
    const parsed = inputSchema.safeParse({ serviceId: form.get("serviceId") });
    const file = form.get("file");
    if (!parsed.success || !(file instanceof File)) return failure("Invalid service photo request.");
    if (file.size > MAX_PHOTO_BYTES) return failure("This legacy upload endpoint accepts up to 4 MiB. Refresh the page to use direct uploads.", 413);
    const invalid = validateBusinessPhoto(file);
    if (invalid) return failure(invalid);

    stage = "authorization";
    const current = await getCurrentProfile();
    if (!current?.user.email_confirmed_at || current.profile?.role !== "provider") {
      return failure("Sign in with the verified provider account that owns this service.", 403);
    }
    const supabase = await createSupabaseServerClient();
    const { data: service, error: serviceError } = await supabase.from("business_services")
      .select("id, businesses!inner(owner_id, slug)")
      .eq("id", parsed.data.serviceId).eq("businesses.owner_id", current.user.id).maybeSingle();
    if (serviceError) throw serviceError;
    if (!service) return failure("Service not found or access denied.", 404);

    stage = "upload_limits";
    const { count, error: countError } = await supabase.from("media_assets").select("id", { count: "exact", head: true })
      .eq("owner_id", current.user.id).gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
    if (countError) throw countError;
    if ((count ?? 0) >= 30) return failure("Too many uploads. Please wait before uploading more files.", 429);

    stage = "validation";
    const source = new Uint8Array(await file.arrayBuffer());
    if (detectMediaType(source) !== file.type) return failure("The file contents do not match its image format.");
    const validated = await validateBusinessImageUpload(source, file.name, file.type);

    const assetId = crypto.randomUUID();
    objectKey = `services/${parsed.data.serviceId}/service_photo/${assetId}-photo${validated.extension}`;
    stage = "storage";
    await putR2Photo(objectKey, source, validated.contentType);
    // Resolve before committing metadata so a URL/configuration failure can be
    // rolled back rather than reporting failure after saving a durable asset.
    const photoUrl = getR2PublicUrl(objectKey) ?? await createR2DownloadUrl(objectKey);

    stage = "metadata";
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
    if (error) throw error;
    if (!asset) throw new Error("Photo metadata could not be saved.");
    committed = true;

    const businesses = service.businesses as unknown as { slug?: string } | { slug?: string }[];
    const slug = Array.isArray(businesses) ? businesses[0]?.slug : businesses?.slug;
    try {
      revalidatePath("/tenant-dashboard/services");
      if (slug) revalidatePath(`/business-profile/${slug}`);
    } catch {
      console.warn("Service photo saved; page revalidation failed.", { requestId });
    }
    return NextResponse.json({
      asset: {
        id: String(asset.id), objectKey: String(asset.object_key), category: "service_photo", visibility: "public",
        contentType: String(asset.content_type), byteSize: Number(asset.byte_size), originalFilename: String(asset.original_filename),
        status: "active", url: photoUrl,
      },
    });
  } catch (cause) {
    if (objectKey && !committed) {
      try { await deleteR2Object(objectKey); } catch { console.warn("Unlinked service photo needs R2 cleanup."); }
    }
    if (cause instanceof PhotoRequestTooLarge) return failure("Each photo must be 4 MB or smaller.", 413);
    if (cause instanceof BusinessPhotoValidationError) return failure(cause.message);
    const diagnostic = cause as { code?: unknown; name?: unknown; $metadata?: { httpStatusCode?: number } } | null;
    console.error("Service photo upload failed", {
      requestId, stage,
      code: typeof diagnostic?.code === "string" ? diagnostic.code : undefined,
      name: typeof diagnostic?.name === "string" ? diagnostic.name : undefined,
      storageStatus: diagnostic?.$metadata?.httpStatusCode,
    });
    const message = stage === "storage"
      ? "The image could not be stored. Check the server's R2 bucket configuration and write permissions."
      : stage === "metadata"
        ? "The image metadata could not be saved. Check the Supabase media migrations and upload permissions."
        : "The upload could not be processed. Check your session and try again.";
    return NextResponse.json({ error: `${message} Reference: ${requestId}`, code: `service_photo_${stage}_failed`, requestId }, { status: 503 });
  }
}
