import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deleteR2Object, putR2Photo } from "@/lib/r2/client";
import { detectMediaType } from "@/features/media/validation";
import { businessPhotos, ownedPhotoBusiness } from "@/features/business-photos/server";
import { MAX_PHOTO_BYTES, validateBusinessPhoto } from "@/features/business-photos/types";

export const runtime = "nodejs";
const inputSchema = z.object({
  businessId: z.string().uuid(), action: z.enum(["add", "replace", "cover", "delete"]),
  photoId: z.string().uuid().optional(),
}).refine((data) => data.action === "add" || Boolean(data.photoId), "Select a photo.");

function failure(error: string, status = 400) { return NextResponse.json({ error }, { status }); }
class PhotoRequestTooLarge extends Error {}

async function readPhotoForm(request: Request) {
  let bytes = 0;
  const body = request.body?.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      bytes += chunk.byteLength;
      if (bytes > MAX_PHOTO_BYTES + 32_768) throw new PhotoRequestTooLarge();
      controller.enqueue(chunk);
    },
  }));
  return new Response(body, { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
}

export async function POST(request: Request) {
  // Same-origin mutations only; credentials stay in the authenticated server.
  if (request.headers.get("origin") !== new URL(request.url).origin) return failure("Request origin is not allowed.", 403);
  if (Number(request.headers.get("content-length")) > MAX_PHOTO_BYTES + 32_768) return failure("Each photo must be 4 MB or smaller.", 413);
  let newKey: string | undefined;
  let committed = false;
  let uncertainCommit = false;
  try {
    const form = await readPhotoForm(request);
    const parsed = inputSchema.safeParse({ businessId: form.get("businessId"), action: form.get("action"), photoId: form.get("photoId") || undefined });
    if (!parsed.success) return failure("Invalid photo request.");
    const { businessId, action, photoId } = parsed.data;
    const owned = await ownedPhotoBusiness(businessId);
    if (!owned) return failure("Sign in with the verified provider account that owns this business.", 403);
    const { supabase, business } = owned;
    // Check replacement ownership before uploading any bytes.
    const photos = await businessPhotos(supabase, businessId, business.cover_photo_path);
    if (action !== "add" && !photos.some((photo) => photo.id === photoId)) return failure("Photo not found.", 404);
    if (action === "add" && photos.length >= 12) return failure("You can upload up to 12 business photos.");
    const file = form.get("file");
    let newId: string | undefined;
    if (action === "add" || action === "replace") {
      if (!(file instanceof File)) return failure("Select a photo to upload.");
      const invalid = validateBusinessPhoto(file);
      if (invalid) return failure(invalid);
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (detectMediaType(bytes) !== file.type) return failure("The file contents do not match its image format.");
      newId = crypto.randomUUID();
      newKey = `businesses/${businessId}/business_gallery/${newId}-photo`;
      await putR2Photo(newKey, bytes, file.type);
    }
    uncertainCommit = true;
    const { error } = await supabase.rpc("manage_business_photo", {
      p_business_id: businessId, p_action: action, p_photo_id: photoId ?? null,
      p_new_id: newId ?? null, p_filename: file instanceof File ? file.name.slice(0, 255) : null,
      p_content_type: file instanceof File ? file.type : null, p_byte_size: file instanceof File ? file.size : null,
    });
    // A connection failure can occur after commit. Never delete the new object
    // when the database outcome is unknown; retain it for reconciliation.
    if (error) {
      uncertainCommit = !(/^[0-9A-Z]{5}$/.test(error.code ?? "") || error.code?.startsWith("PGRST"));
      console.error("Business photo metadata write failed", { code: error.code || "connection_error" });
      throw new Error("Photo metadata could not be saved.");
    }
    committed = true;
    const { data: deleted } = await supabase.from("media_assets").select("id, object_key")
      .eq("business_id", businessId).eq("status", "deleted").in("category", ["business_cover", "business_gallery"]).limit(12);
    for (const photo of deleted ?? []) {
      try {
        await deleteR2Object(String(photo.object_key));
        await supabase.from("media_assets").delete().eq("id", photo.id).eq("status", "deleted");
      } catch { console.warn("Business photo removed from gallery; R2 cleanup will retry on the next gallery change."); }
    }
    revalidatePath("/"); revalidatePath("/wishlist");
    revalidatePath(`/business-profile/${business.slug}`); revalidatePath("/tenant-dashboard/profile");
    const { data: updated } = await supabase.from("businesses").select("cover_photo_path").eq("id", businessId).single();
    return NextResponse.json({ photos: await businessPhotos(supabase, businessId, updated?.cover_photo_path ?? null) });
  } catch (cause) {
    if (newKey && !committed && !uncertainCommit) {
      try { await deleteR2Object(newKey); } catch { console.warn("Unlinked business photo needs R2 cleanup."); }
    }
    if (cause instanceof PhotoRequestTooLarge) return failure("Each photo must be 4 MB or smaller.", 413);
    return failure(committed ? "The change was saved, but the gallery could not refresh. Reload this page." : "Unable to save the photo. Check the R2 configuration and database migration, then try again.", 503);
  }
}
