"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { getCurrentProfile, isEmailVerified } from "@/server/auth/session";
import { deleteR2Object } from "@/lib/r2/client";
import { businessAmenitiesUpdateSchema, businessHoursUpdateSchema, businessProfileSchema, businessServiceSchema, providerApplicationSchema, type BusinessServiceInput } from "../schemas";

type ActionResult = { ok: true; id: string } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function validationError(result: { error: { flatten: () => { fieldErrors: Record<string, string[]> } } }): ActionResult {
  return { ok: false, error: "Please correct the highlighted fields.", fieldErrors: result.error.flatten().fieldErrors };
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "business";
}

export async function submitProviderApplication(input: unknown): Promise<ActionResult> {
  const parsed = providerApplicationSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed);
  const current = await getCurrentProfile();
  if (!current?.user || !current.profile || !isEmailVerified(current.user)) {
    return { ok: false, error: "Please sign in and verify your email before submitting an application." };
  }
  if (current.profile.role !== "customer") {
    return { ok: false, error: "Only customer accounts can submit a new provider application." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existingBusiness } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", current.user.id)
    .limit(1)
    .maybeSingle();
  if (existingBusiness) {
    return { ok: false, error: "This account already has a registered business." };
  }
  const { data: pending } = await supabase.from("provider_applications").select("id").eq("applicant_id", current.user.id).eq("status", "pending").maybeSingle();
  if (pending) return { ok: false, error: "You already have a provider application under review." };

  const value = parsed.data;
  const { data, error } = await supabase.from("provider_applications").insert({
    applicant_id: current.user.id,
    provider_type: value.providerType,
    business_name: value.businessName,
    business_description: value.businessDescription,
    years_experience: value.yearsExperience,
    facebook_page: value.facebookPage || null,
    location_details: value.locationDetails,
    selected_services: value.selectedServices,
    identity_details: value.identity,
    identity_documents: Object.entries(value.uploadedFiles).map(([label, path]) => ({ label, path })),
    billing_details: value.billing,
  }).select("id").single();
  if (error) {
    // Keep the client-facing message safe, but retain the database diagnostic in
    // server logs so schema/RLS problems are distinguishable from transient failures.
    console.error("submitProviderApplication insert failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    if (error.code === "42703" || error.code === "PGRST204") {
      return {
        ok: false,
        error: "The provider application database is missing a required field. Apply the latest Supabase migration, then try again.",
      };
    }

    return { ok: false, error: "We could not submit the provider application. Please try again." };
  }
  revalidatePath("/list-your-business");
  return { ok: true, id: String(data.id) };
}

export async function saveBusinessProfile(input: unknown): Promise<ActionResult> {
  const parsed = businessProfileSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed);
  const current = await getCurrentProfile();
  if (!current?.user || !current.profile || current.profile.role !== "provider") return { ok: false, error: "Provider access is required." };
  const value = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase.from("businesses").select("id, slug").eq("owner_id", current.user.id).limit(1).maybeSingle();
  let slug = existing?.slug ?? slugify(value.businessName);
  if (!existing) {
    const { data: duplicate } = await supabase.from("businesses").select("id").eq("slug", slug).maybeSingle();
    if (duplicate) slug = `${slug}-${current.user.id.slice(0, 8)}`;
  }
  const businessPayload = {
    owner_id: current.user.id,
    slug,
    name: value.businessName,
    provider_type: value.providerType,
    description: value.businessDescription,
    years_experience: value.yearsExperience,
    facebook_page: value.facebookPage || null,
  };
  const { data: business, error } = existing
    ? await supabase.from("businesses").update(businessPayload).eq("id", existing.id).select("id").single()
    : await supabase.from("businesses").insert(businessPayload).select("id").single();
  if (error) return { ok: false, error: "Unable to save your business profile." };
  const [longitude, latitude] = value.locationDetails.coordinates ?? [null, null];
  const { error: locationError } = await supabase.from("business_locations").upsert({
    business_id: business.id,
    province: value.locationDetails.province,
    city_municipality: value.locationDetails.cityMunicipality,
    barangay: value.locationDetails.barangay,
    street_address: value.locationDetails.streetAddress,
    landmark: value.locationDetails.landmark,
    additional_details: value.locationDetails.additionalDetails,
    longitude,
    latitude,
  });
  if (locationError) return { ok: false, error: "Business saved, but the location could not be saved." };
  revalidatePath("/tenant-dashboard/profile");
  revalidatePath(`/business-profile/${slug}`);
  return { ok: true, id: String(business.id) };
}

function parsePrice(value: string) {
  const parsed = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDuration(value: string) {
  const parsed = Number(value.match(/\d+/)?.[0] ?? "");
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function saveBusinessService(businessId: string, input: unknown): Promise<ActionResult> {
  const parsed = businessServiceSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed);
  const current = await getCurrentProfile();
  if (!current?.user || !current.profile || current.profile.role !== "provider") return { ok: false, error: "Provider access is required." };
  const value: BusinessServiceInput = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { data: owned } = await supabase.from("businesses").select("id").eq("id", businessId).eq("owner_id", current.user.id).maybeSingle();
  if (!owned) return { ok: false, error: "You do not own this business." };
  const payload = { business_id: businessId, category: value.category, title: value.title, description: value.description, starting_price: parsePrice(value.price), duration_minutes: parseDuration(value.duration), status: value.status.toLowerCase() };
  const result = value.id
    ? await supabase.from("business_services").update(payload).eq("id", value.id).select("id").single()
    : await supabase.from("business_services").insert(payload).select("id").single();
  if (result.error) return { ok: false, error: "Unable to save the service." };
  revalidatePath("/tenant-dashboard/services");
  return { ok: true, id: String(result.data.id) };
}

export async function deleteBusinessService(businessId: string, serviceId: string): Promise<ActionResult> {
  const current = await getCurrentProfile();
  if (!current?.user || !current.profile || current.profile.role !== "provider") return { ok: false, error: "Provider access is required." };
  const supabase = await createSupabaseServerClient();
  const { data: mediaAssets } = await supabase
    .from("media_assets")
    .select("object_key")
    .eq("service_id", serviceId);
  try {
    await Promise.all((mediaAssets ?? []).map((asset) => deleteR2Object(String(asset.object_key))));
  } catch {
    return { ok: false, error: "The service photos could not be removed from storage." };
  }
  const { error } = await supabase.from("business_services").delete().eq("id", serviceId).eq("business_id", businessId);
  if (error) return { ok: false, error: "Unable to delete the service." };
  revalidatePath("/tenant-dashboard/services");
  return { ok: true, id: serviceId };
}

export async function deleteServiceMedia(serviceId: string, assetIds: string[]): Promise<ActionResult> {
  if (!assetIds.length) return { ok: true, id: serviceId };
  const current = await getCurrentProfile();
  if (!current?.user || !current.profile || current.profile.role !== "provider") return { ok: false, error: "Provider access is required." };
  const supabase = await createSupabaseServerClient();
  const { data: service } = await supabase
    .from("business_services")
    .select("id, businesses!inner(owner_id)")
    .eq("id", serviceId)
    .eq("businesses.owner_id", current.user.id)
    .maybeSingle();
  if (!service) return { ok: false, error: "You do not own this service." };
  const { data: assets } = await supabase
    .from("media_assets")
    .select("id, object_key")
    .in("id", assetIds)
    .eq("service_id", serviceId)
    .eq("category", "service_photo");
  try {
    await Promise.all((assets ?? []).map((asset) => deleteR2Object(String(asset.object_key))));
    if (assets?.length) {
      const { error } = await supabase.from("media_assets").delete().in("id", assets.map((asset) => asset.id));
      if (error) throw error;
    }
  } catch {
    return { ok: false, error: "One or more service photos could not be removed." };
  }
  revalidatePath("/tenant-dashboard/services");
  return { ok: true, id: serviceId };
}

export async function saveBusinessHours(businessId: string, input: unknown): Promise<ActionResult> {
  const parsed = businessHoursUpdateSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed);
  const current = await getCurrentProfile();
  if (!current?.user || !current.profile || current.profile.role !== "provider") return { ok: false, error: "Provider access is required." };
  const supabase = await createSupabaseServerClient();
  const rows = parsed.data.hours.map((entry, dayOfWeek) => ({
    business_id: businessId,
    day_of_week: dayOfWeek,
    is_open: entry.open,
    open_time: entry.open ? entry.openTime : null,
    close_time: entry.open ? entry.closeTime : null,
  }));
  const { error } = await supabase.from("business_hours").upsert(rows, { onConflict: "business_id,day_of_week" });
  if (error) return { ok: false, error: "Unable to save business hours." };
  revalidatePath("/tenant-dashboard/profile");
  return { ok: true, id: businessId };
}

export async function saveBusinessAmenities(businessId: string, input: unknown): Promise<ActionResult> {
  const parsed = businessAmenitiesUpdateSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed);
  const current = await getCurrentProfile();
  if (!current?.user || !current.profile || current.profile.role !== "provider") return { ok: false, error: "Provider access is required." };
  const supabase = await createSupabaseServerClient();
  const { error: deleteError } = await supabase.from("business_amenities").delete().eq("business_id", businessId);
  if (deleteError) return { ok: false, error: "Unable to update amenities." };
  if (parsed.data.amenities.length) {
    const { error } = await supabase.from("business_amenities").insert(parsed.data.amenities.map((amenity) => ({
      business_id: businessId,
      amenity_id: amenity.id,
      label: amenity.label,
      is_custom: Boolean(amenity.custom),
    })));
    if (error) return { ok: false, error: "Unable to update amenities." };
  }
  revalidatePath("/tenant-dashboard/profile");
  return { ok: true, id: businessId };
}
