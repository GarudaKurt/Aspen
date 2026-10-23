import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { createR2DownloadUrl, getR2PublicUrl } from "@/lib/r2/client";
import { requireRole } from "@/server/auth/guard";
import { getCurrentProfile } from "@/server/auth/session";
import type { BusinessAmenity } from "@/features/business-profile/amenities";
import type { BusinessLocationDetails } from "@/features/business-profile/location";
import type { ProviderApplicationSummary, TenancyBusiness, TenancyService } from "../types";

function mapLocation(row: Record<string, unknown> | null): BusinessLocationDetails | undefined {
  if (!row) return undefined;
  const longitude = typeof row.longitude === "number" ? row.longitude : null;
  const latitude = typeof row.latitude === "number" ? row.latitude : null;
  return {
    province: String(row.province ?? ""),
    cityMunicipality: String(row.city_municipality ?? ""),
    barangay: String(row.barangay ?? ""),
    streetAddress: String(row.street_address ?? ""),
    landmark: String(row.landmark ?? ""),
    additionalDetails: String(row.additional_details ?? ""),
    coordinates: longitude !== null && latitude !== null ? [longitude, latitude] : null,
  };
}

function mapBusiness(row: Record<string, unknown>): TenancyBusiness {
  const location = Array.isArray(row.business_locations) ? row.business_locations[0] : row.business_locations;
  const hours = (Array.isArray(row.business_hours) ? row.business_hours : []).map((entry) => ({
    day: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][Number(entry.day_of_week)] ?? "Monday",
    open: Boolean(entry.is_open),
    openTime: String(entry.open_time ?? "08:00").slice(0, 5),
    closeTime: String(entry.close_time ?? "20:00").slice(0, 5),
  }));
  const amenities = (Array.isArray(row.business_amenities) ? row.business_amenities : []).map((entry) => ({
    id: String(entry.amenity_id),
    label: String(entry.label),
    custom: Boolean(entry.is_custom),
  })) as BusinessAmenity[];
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    slug: String(row.slug),
    name: String(row.name),
    providerType: String(row.provider_type),
    description: String(row.description ?? ""),
    yearsExperience: row.years_experience === null ? null : Number(row.years_experience),
    facebookPage: String(row.facebook_page ?? ""),
    status: row.status as TenancyBusiness["status"],
    verified: Boolean(row.verified),
    coverPhotoPath: row.cover_photo_path ? String(row.cover_photo_path) : null,
    location: mapLocation(location ?? null),
    hours,
    amenities,
  };
}

async function resolveMediaUrl(objectKey: string, visibility: string) {
  try {
    if (visibility === "public") return getR2PublicUrl(objectKey) ?? await createR2DownloadUrl(objectKey);
    return await createR2DownloadUrl(objectKey);
  } catch {
    return null;
  }
}

async function getActiveMedia(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, column: "business_id" | "service_id", ids: string[]) {
  if (!ids.length) return [];
  const { data } = await supabase
    .from("media_assets")
    .select("id, business_id, service_id, category, object_key, visibility, created_at")
    .in(column, ids)
    .eq("status", "active");
  return Promise.all((data ?? []).map(async (asset) => ({
    ...asset,
    url: await resolveMediaUrl(String(asset.object_key), String(asset.visibility)),
  })));
}

export async function getMyProviderApplication(): Promise<ProviderApplicationSummary | null> {
  const current = await getCurrentProfile();
  if (!current?.user) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("provider_applications")
    .select("id, status, business_id, business_name, review_notes, submitted_at, reviewed_at")
    .eq("applicant_id", current.user.id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: String(data.id),
    status: data.status as ProviderApplicationSummary["status"],
    businessId: data.business_id ? String(data.business_id) : null,
    businessName: String(data.business_name),
    reviewNotes: data.review_notes ? String(data.review_notes) : null,
    submittedAt: String(data.submitted_at),
    reviewedAt: data.reviewed_at ? String(data.reviewed_at) : null,
  };
}

export async function getMyBusiness() {
  const current = await requireRole("provider", "/tenant-dashboard/profile");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("*, business_locations(*), business_hours(*), business_amenities(*)")
    .eq("owner_id", current.user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Unable to load the provider business.");
  if (!data) return null;
  const business = mapBusiness(data);
  const media = await getActiveMedia(supabase, "business_id", [business.id]);
  const cover = media.find((asset) => asset.category === "business_cover" && asset.url);
  return { ...business, coverPhotoPath: cover?.url ?? business.coverPhotoPath };
}

export async function getMyServices(businessId?: string) {
  const current = await requireRole("provider", "/tenant-dashboard/services");
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("business_services").select("*, business_service_photos(*)").order("created_at", { ascending: false });
  if (businessId) query = query.eq("business_id", businessId);
  else {
    const { data: business } = await supabase.from("businesses").select("id").eq("owner_id", current.user.id).limit(1).maybeSingle();
    if (!business) return [];
    query = query.eq("business_id", business.id);
  }
  const { data, error } = await query;
  if (error) throw new Error("Unable to load provider services.");
  const serviceIds = (data ?? []).map((row) => String(row.id));
  const media = await getActiveMedia(supabase, "service_id", serviceIds);
  return (data ?? []).map((row) => {
    const photos = (Array.isArray(row.business_service_photos) ? row.business_service_photos : []) as Array<Record<string, unknown>>;
    const r2Photos = media
      .filter((asset) => asset.service_id === row.id && asset.category === "service_photo" && asset.url)
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .map((asset) => String(asset.url));
    const r2AssetIds = media
      .filter((asset) => asset.service_id === row.id && asset.category === "service_photo" && asset.url)
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .map((asset) => String(asset.id));
    return ({
    id: String(row.id),
    businessId: String(row.business_id),
    category: String(row.category),
    title: String(row.title),
    description: String(row.description),
    price: row.starting_price === null ? "" : `₱${Number(row.starting_price).toLocaleString("en-PH")}`,
    duration: row.duration_minutes ? `${row.duration_minutes} min` : "By appointment",
    status: ({ active: "Active", draft: "Draft", paused: "Paused" } as const)[row.status as "active" | "draft" | "paused"],
    photos: r2Photos.length ? r2Photos : photos.sort((a, b) => Number(a.sort_order) - Number(b.sort_order)).map((photo) => String(photo.storage_path)),
    photoAssetIds: r2Photos.length ? r2AssetIds : photos.map(() => null),
  });
  }) as TenancyService[];
}

export async function getPublishedBusiness(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("*, business_locations(*), business_hours(*), business_amenities(*)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error("Unable to load this business.");
  if (!data) return null;
  const business = mapBusiness(data);
  const media = await getActiveMedia(supabase, "business_id", [business.id]);
  const cover = media.find((asset) => asset.category === "business_cover" && asset.url);
  return { ...business, coverPhotoPath: cover?.url ?? business.coverPhotoPath };
}

export async function getPublishedBusinessServices(businessId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("business_services")
    .select("id, category, title, description, starting_price, status")
    .eq("business_id", businessId)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (error) throw new Error("Unable to load business services.");
  const media = await getActiveMedia(supabase, "service_id", (data ?? []).map((row) => String(row.id)));
  return (data ?? []).map((row) => ({
    id: String(row.id),
    category: String(row.category),
    title: String(row.title),
    description: String(row.description),
    price: row.starting_price === null ? "Contact for pricing" : `₱${Number(row.starting_price).toLocaleString("en-PH")}`,
    photos: media
      .filter((asset) => asset.service_id === row.id && asset.category === "service_photo" && asset.url)
      .map((asset) => String(asset.url)),
  }));
}
