import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { businessPhotos } from "@/features/business-photos/server";
import { MAX_PHOTO_BYTES, validateBusinessPhoto } from "@/features/business-photos/types";
import { BusinessPhotoValidationError, safeOriginalImageFilename, validateBusinessImageUpload } from "@/features/business-photos/validate";
import { photoObjectKey, photoStagingKey, signPhotoTicket, verifyPhotoTicket, type PhotoTicket } from "@/features/business-photos/upload-ticket";
import { createPhotoStagingUrl, createR2DownloadUrl, deleteR2Object, deleteStagedPhoto, finalizedPhotoMatches, getR2PublicUrl, putValidatedPhoto, readStagedPhoto } from "@/lib/r2/client";

export const runtime = "nodejs";
export const maxDuration = 60;
const initSchema = z.object({
  operation: z.literal("init"), uploadId: z.string().uuid(), kind: z.enum(["business", "service"]), targetId: z.string().uuid(),
  action: z.enum(["add", "replace", "add_cover", "replace_cover"]).default("add"), photoId: z.string().uuid().optional(),
  name: z.string().min(1).max(255), type: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.number().int().positive().max(MAX_PHOTO_BYTES), sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
const inputSchema = z.discriminatedUnion("operation", [initSchema, z.object({ operation: z.literal("complete"), ticket: z.string().max(4096) }), z.object({ operation: z.literal("cancel"), uploadId: z.string().uuid() })]);
class UploadError extends Error { constructor(message: string, readonly status = 400) { super(message); } }

async function readMetadata(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new UploadError("Send upload metadata as JSON.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new UploadError("Upload details are required.");
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.byteLength;
      if (bytes > 8192) throw new UploadError("Upload metadata is too large.", 413);
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  try { return inputSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
  catch { throw new UploadError("Invalid upload details or image size."); }
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  const requestId = crypto.randomUUID(); let stage = "authorization";
  let failPending: (() => Promise<void>) | undefined;
  try {
    const current = await getCurrentProfile();
    if (!current?.user.email_confirmed_at || current.profile?.role !== "provider") throw new UploadError("Sign in with a verified provider account.", 403);
    const supabase = await createSupabaseServerClient();
    const input = await readMetadata(request);
    if (input.operation === "cancel") {
      // The status predicate makes cancellation a no-op after a successful commit.
      const { data, error } = await supabase.rpc("cancel_photo_upload", { p_id: input.uploadId });
      if (error) throw error;
      const cancelled = data?.[0];
      if (cancelled?.upload_sha256) await deleteStagedPhoto(`pending/${current.user.id}/${cancelled.id}/${cancelled.upload_sha256}`).catch(() => {});
      return NextResponse.json({ cancelled: true });
    }
    let ticket: PhotoTicket;
    if (input.operation === "init") {
      const invalid = validateBusinessPhoto(input); if (invalid) throw new UploadError(invalid);
      if (input.kind === "service" && (input.action !== "add" || input.photoId)) throw new UploadError("Invalid service photo action.");
      if (["replace", "replace_cover"].includes(input.action) !== Boolean(input.photoId)) throw new UploadError("Select the photo being replaced.");
      ticket = { id: input.uploadId, ownerId: current.user.id, kind: input.kind, targetId: input.targetId,
        action: input.action, photoId: input.photoId, name: safeOriginalImageFilename(input.name, input.type),
        type: input.type, size: input.size, sha256: input.sha256, expires: Date.now() + 10 * 60_000 };
    } else {
      try { ticket = verifyPhotoTicket(input.ticket); } catch { throw new UploadError("Upload ticket is invalid or expired. Retry this image."); }
    }
    if (ticket.ownerId !== current.user.id) throw new UploadError("Upload access denied.", 403);
    if (ticket.size > MAX_PHOTO_BYTES) throw new UploadError("This image exceeds the current upload limit.");
    let businessId = ticket.targetId;
    if (ticket.kind === "service") {
      const { data, error } = await supabase.from("business_services").select("business_id").eq("id", ticket.targetId).maybeSingle();
      if (error) throw error;
      if (!data) throw new UploadError("Service not found.", 404);
      businessId = data.business_id;
    }
    const { data: business, error: businessError } = await supabase.from("businesses").select("id, slug, cover_photo_path")
      .eq("id", businessId).eq("owner_id", current.user.id).maybeSingle();
    if (businessError) throw businessError;
    if (!business) throw new UploadError("Business not found or access denied.", 403);
    const key = photoObjectKey(ticket), stagingKey = photoStagingKey(ticket);
    if (input.operation === "init") {
      stage = "configuration";
      const uploadUrl = await createPhotoStagingUrl(stagingKey, ticket.type, ticket.size);
      stage = "reservation";
      const { error } = await supabase.rpc("reserve_photo_upload", {
        p_id: ticket.id, p_kind: ticket.kind, p_target_id: ticket.targetId, p_action: ticket.action, p_photo_id: ticket.photoId ?? null,
        p_filename: ticket.name, p_content_type: ticket.type, p_byte_size: ticket.size, p_sha256: ticket.sha256,
      });
      if (error) {
        if (/rate limit/i.test(error.message)) throw new UploadError("Upload limit reached. Wait before trying more images.", 429);
        if (error.code === "P0001") throw new UploadError(error.message, 409);
        throw error;
      }
      stage = "storage";
      const uploaded = await finalizedPhotoMatches(key, ticket.size, ticket.sha256);
      return NextResponse.json({ ticket: signPhotoTicket(ticket), uploadUrl, uploaded }, { headers: { "Cache-Control": "no-store" } });
    }
    stage = "reservation";
    const { data: reservation, error: reservationError } = await supabase.from("media_assets")
      .select("id, object_key, status, upload_sha256, byte_size, content_type, upload_action, upload_photo_id")
      .eq("id", ticket.id).eq("owner_id", current.user.id).maybeSingle();
    if (reservationError) throw reservationError;
    if (!reservation || !["pending", "active"].includes(reservation.status) || reservation.object_key !== key
      || reservation.upload_sha256 !== ticket.sha256 || Number(reservation.byte_size) !== ticket.size
      || reservation.content_type !== ticket.type || reservation.upload_action !== ticket.action
      || (reservation.upload_photo_id ?? undefined) !== ticket.photoId) throw new UploadError("Upload reservation is missing or has changed.", 409);
    stage = "validation";
    failPending = async () => {
      const { error } = await supabase.rpc("cancel_photo_upload", { p_id: ticket.id });
      if (error) throw error;
      await deleteStagedPhoto(stagingKey);
    };
    if (!(await finalizedPhotoMatches(key, ticket.size, ticket.sha256))) {
      const { error: quotaError } = await supabase.rpc("consume_photo_upload_quota", { p_phase: "validate" });
      if (quotaError) {
        if (/rate limit/i.test(quotaError.message)) throw new UploadError("Image validation limit reached. Wait before retrying.", 429);
        throw quotaError;
      }
      const bytes = await readStagedPhoto(stagingKey, ticket.size);
      if (createHash("sha256").update(bytes).digest("hex") !== ticket.sha256) throw new UploadError("The uploaded image does not match the selected file. Retry it.");
      await validateBusinessImageUpload(bytes, ticket.name, ticket.type);
      stage = "storage";
      await putValidatedPhoto(key, bytes, ticket.type, ticket.sha256);
    }
    stage = "metadata";
    const { data: oldKey, error } = await supabase.rpc("finish_photo_upload", { p_id: ticket.id });
    if (error) {
      if (error.code === "P0001") throw new UploadError(error.message, 409);
      // Retain the validated object when commit outcome is unknown; retries reconcile.
      throw error;
    }
    await deleteStagedPhoto(stagingKey).catch(() => console.warn("Photo staging cleanup pending", { requestId }));
    let replacedKey = oldKey;
    // Recover cleanup even when an earlier commit succeeded but its response was lost.
    if (!replacedKey && ticket.photoId) {
      const { data } = await supabase.from("media_assets").select("object_key").eq("id", ticket.photoId)
        .eq("owner_id", current.user.id).eq("status", "deleted").maybeSingle();
      replacedKey = data?.object_key;
    }
    if (replacedKey) await deleteR2Object(String(replacedKey)).catch(() => console.warn("Replaced photo cleanup pending", { requestId }));
    try { revalidatePath("/"); revalidatePath(`/business-profile/${business.slug}`); revalidatePath(`/tenant-dashboard/${ticket.kind === "business" ? "profile" : "services"}`); }
    catch { console.warn("Photo saved; page revalidation pending", { requestId }); }
    if (ticket.kind === "business") {
      const { data, error: refreshError } = await supabase.from("businesses").select("cover_photo_path").eq("id", businessId).single();
      if (refreshError) throw refreshError;
      return NextResponse.json({ photos: await businessPhotos(supabase, businessId, data.cover_photo_path) }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ asset: { id: ticket.id, objectKey: key, category: "service_photo", visibility: "public", contentType: ticket.type,
      byteSize: ticket.size, originalFilename: ticket.name, status: "active", url: getR2PublicUrl(key) ?? await createR2DownloadUrl(key) } }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    if (cause instanceof UploadError || cause instanceof BusinessPhotoValidationError) {
      if (cause instanceof BusinessPhotoValidationError || (cause.status === 400 && stage === "validation")) {
        await failPending?.().catch(() => console.warn("Invalid upload cleanup pending", { requestId }));
      }
      return NextResponse.json({ error: cause.message }, { status: cause instanceof UploadError ? cause.status : 400 });
    }
    const diagnostic = cause as { code?: string; name?: string; $metadata?: { httpStatusCode?: number } };
    console.error("Direct photo upload failed", { requestId, stage, code: diagnostic.code, name: diagnostic.name, storageStatus: diagnostic.$metadata?.httpStatusCode });
    const message = stage === "configuration" ? "Photo uploads need a separate private R2 staging bucket. Contact support."
      : stage === "reservation" || stage === "metadata" ? "Photo metadata could not be saved. Check migration 0030 and upload permissions."
      : stage === "validation" ? "The uploaded image could not be validated. Retry this image."
      : "The photo upload could not be completed. Retry this image.";
    return NextResponse.json({ error: `${message} Reference: ${requestId}`, requestId }, { status: 503 });
  }
}
