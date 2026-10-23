"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { getCurrentProfile } from "@/server/auth/session";
import { createR2DownloadUrl, createR2UploadUrl, deleteR2Object, getR2PublicUrl, readR2Object } from "@/lib/r2/client";
import { mediaUploadRequestSchema, type MediaUploadRequest } from "../schemas";
import { detectMediaType, isMediaTypeAllowed } from "../validation";
import type { MediaAsset, MediaUploadTicket } from "../types";

type ActionResult<T = MediaAsset> = { ok: true; data: T } | { ok: false; error: string };

function safeFilename(fileName: string) {
  return fileName.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "upload";
}

async function canManageTarget(input: MediaUploadRequest, userId: string, isAdmin: boolean) {
  if (isAdmin) return true;
  const supabase = await createSupabaseServerClient();
  if (input.businessId) {
    const { data } = await supabase.from("businesses").select("id").eq("id", input.businessId).eq("owner_id", userId).maybeSingle();
    if (!data) return false;
  }
  if (input.serviceId) {
    const { data } = await supabase.from("business_services").select("id, businesses!inner(owner_id)").eq("id", input.serviceId).eq("businesses.owner_id", userId).maybeSingle();
    if (!data) return false;
  }
  if (input.providerApplicationId) {
    const { data } = await supabase.from("provider_applications").select("id").eq("id", input.providerApplicationId).eq("applicant_id", userId).maybeSingle();
    if (!data) return false;
  }
  return true;
}

function objectKey(input: MediaUploadRequest, userId: string, assetId: string) {
  const target = input.businessId
    ? `businesses/${input.businessId}`
    : input.serviceId
      ? `services/${input.serviceId}`
      : input.providerApplicationId
        ? `applications/${input.providerApplicationId}`
        : `users/${userId}`;
  return `${target}/${input.category}/${assetId}-${safeFilename(input.fileName)}`;
}

async function getOwnedAsset(assetId: string) {
  const current = await getCurrentProfile();
  if (!current?.user || !current.profile) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("media_assets").select("*").eq("id", assetId).maybeSingle();
  if (!data) return null;
  if (current.profile.role !== "admin" && data.owner_id !== current.user.id) return null;
  return { current, supabase, data };
}

export async function createMediaUpload(input: unknown): Promise<ActionResult<MediaUploadTicket>> {
  const parsed = mediaUploadRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "The upload details are invalid." };
  const current = await getCurrentProfile();
  if (!current?.user || !current.profile) return { ok: false, error: "You must be signed in to upload files." };
  if (!(await canManageTarget(parsed.data, current.user.id, current.profile.role === "admin"))) return { ok: false, error: "You are not allowed to upload to this record." };

  const assetId = crypto.randomUUID();
  const supabase = await createSupabaseServerClient();
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("media_assets")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", current.user.id)
    .gte("created_at", windowStart);
  if ((count ?? 0) >= 30) return { ok: false, error: "Too many uploads. Please wait before uploading more files." };
  const key = objectKey(parsed.data, current.user.id, assetId);
  const { error } = await supabase.from("media_assets").insert({
    id: assetId,
    owner_id: current.user.id,
    business_id: parsed.data.businessId ?? null,
    service_id: parsed.data.serviceId ?? null,
    provider_application_id: parsed.data.providerApplicationId ?? null,
    category: parsed.data.category,
    visibility: parsed.data.visibility,
    object_key: key,
    original_filename: parsed.data.fileName,
    content_type: parsed.data.contentType,
    byte_size: parsed.data.byteSize,
    status: "pending",
  });
  if (error) return { ok: false, error: "Unable to create the media upload record." };
  try {
    const uploadUrl = await createR2UploadUrl(key, parsed.data.contentType);
    return { ok: true, data: { assetId, objectKey: key, uploadUrl, expiresIn: 600 } };
  } catch {
    await supabase.from("media_assets").delete().eq("id", assetId);
    return { ok: false, error: "Cloudflare R2 is not configured or unavailable." };
  }
}

export async function completeMediaUpload(assetId: string): Promise<ActionResult> {
  const owned = await getOwnedAsset(assetId);
  if (!owned) return { ok: false, error: "Media asset not found or access denied." };
  const { data, supabase } = owned;
  try {
    const object = await readR2Object(data.object_key);
    const detectedType = detectMediaType(object.bytes);
    if (object.contentLength !== Number(data.byte_size) || !isMediaTypeAllowed(data.content_type as MediaUploadRequest["contentType"], detectedType)) {
      await deleteR2Object(data.object_key);
      await supabase.from("media_assets").update({ status: "failed" }).eq("id", assetId);
      return { ok: false, error: "The uploaded file failed server-side validation." };
    }
    const { data: updated, error } = await supabase.from("media_assets").update({ status: "active", uploaded_at: new Date().toISOString() }).eq("id", assetId).select("*").single();
    if (error) throw error;
    return { ok: true, data: await mapAsset(updated) };
  } catch {
    await supabase.from("media_assets").update({ status: "failed" }).eq("id", assetId);
    return { ok: false, error: "The uploaded file could not be verified." };
  }
}

async function mapAsset(row: Record<string, unknown>): Promise<MediaAsset> {
  const visibility = row.visibility as MediaAsset["visibility"];
  const url = visibility === "public"
    ? getR2PublicUrl(String(row.object_key)) ?? await createR2DownloadUrl(String(row.object_key))
    : await createR2DownloadUrl(String(row.object_key));
  return {
    id: String(row.id),
    objectKey: String(row.object_key),
    category: row.category as MediaAsset["category"],
    visibility,
    contentType: String(row.content_type),
    byteSize: Number(row.byte_size),
    originalFilename: String(row.original_filename),
    status: row.status as MediaAsset["status"],
    url,
  };
}

export async function getMediaUrl(assetId: string): Promise<ActionResult<{ url: string }>> {
  const owned = await getOwnedAsset(assetId);
  if (!owned || owned.data.status !== "active") return { ok: false, error: "Media asset not found or access denied." };
  const url = owned.data.visibility === "public"
    ? getR2PublicUrl(String(owned.data.object_key)) ?? await createR2DownloadUrl(String(owned.data.object_key))
    : await createR2DownloadUrl(String(owned.data.object_key));
  return { ok: true, data: { url } };
}

export async function deleteMediaAsset(assetId: string): Promise<ActionResult<{ id: string }>> {
  const owned = await getOwnedAsset(assetId);
  if (!owned) return { ok: false, error: "Media asset not found or access denied." };
  try {
    await deleteR2Object(String(owned.data.object_key));
    const { error } = await owned.supabase.from("media_assets").delete().eq("id", assetId);
    if (error) throw error;
    revalidatePath("/tenant-dashboard/profile");
    revalidatePath("/tenant-dashboard/services");
    return { ok: true, data: { id: assetId } };
  } catch {
    await owned.supabase.from("media_assets").update({ status: "deleted" }).eq("id", assetId);
    return { ok: false, error: "The R2 object could not be removed completely." };
  }
}

export async function linkApplicationMedia(applicationId: string, assetIds: string[]) {
  const current = await getCurrentProfile();
  if (!current?.user) return { ok: false, error: "You must be signed in." } as const;
  const supabase = await createSupabaseServerClient();
  const { data: application } = await supabase.from("provider_applications").select("id").eq("id", applicationId).eq("applicant_id", current.user.id).maybeSingle();
  if (!application) return { ok: false, error: "Application not found." } as const;
  const { data: assets } = await supabase
    .from("media_assets")
    .select("object_key, original_filename, content_type, byte_size")
    .in("id", assetIds)
    .eq("owner_id", current.user.id)
    .eq("provider_application_id", applicationId)
    .eq("category", "identity_document")
    .eq("visibility", "private")
    .eq("status", "active");
  const { error } = await supabase.from("provider_applications").update({ identity_documents: assets ?? [] }).eq("id", applicationId);
  return error ? { ok: false, error: "Application files could not be linked." } as const : { ok: true } as const;
}

export async function setBusinessCoverAsset(businessId: string, assetId: string | null) {
  const current = await getCurrentProfile();
  if (!current?.user || !current.profile) return { ok: false, error: "You must be signed in." } as const;
  const supabase = await createSupabaseServerClient();
  const isAdmin = current.profile.role === "admin";
  const { data: business } = await supabase
    .from("businesses")
    .select("id, owner_id, cover_photo_path")
    .eq("id", businessId)
    .maybeSingle();
  if (!business || (!isAdmin && business.owner_id !== current.user.id)) {
    return { ok: false, error: "You do not own this business." } as const;
  }

  let nextObjectKey: string | null = null;
  let nextAssetId: string | null = null;
  if (assetId) {
    const { data: asset } = await supabase
      .from("media_assets")
      .select("id, object_key")
      .eq("id", assetId)
      .eq("business_id", businessId)
      .eq("category", "business_cover")
      .eq("status", "active")
      .maybeSingle();
    if (!asset) return { ok: false, error: "The cover image could not be found." } as const;
    nextObjectKey = String(asset.object_key);
    nextAssetId = String(asset.id);
  }

  const { error } = await supabase
    .from("businesses")
    .update({ cover_photo_path: nextObjectKey })
    .eq("id", businessId);
  if (error) return { ok: false, error: "The business cover image could not be saved." } as const;

  if (business.cover_photo_path && business.cover_photo_path !== nextObjectKey) {
    await deleteR2Object(String(business.cover_photo_path)).catch(() => undefined);
    await supabase
      .from("media_assets")
      .delete()
      .eq("business_id", businessId)
      .eq("category", "business_cover")
      .eq("object_key", business.cover_photo_path);
  }
  revalidatePath("/tenant-dashboard/profile");
  revalidatePath("/business-profile", "layout");
  return { ok: true, assetId: nextAssetId } as const;
}

