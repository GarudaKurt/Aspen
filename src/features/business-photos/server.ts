import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { getCurrentProfile } from "@/server/auth/session";
import type { BusinessPhoto } from "./types";

export async function ownedPhotoBusiness(businessId: string) {
  const current = await getCurrentProfile();
  if (!current?.user.email_confirmed_at || current.profile?.role !== "provider") return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("businesses").select("id, slug, cover_photo_path")
    .eq("id", businessId).eq("owner_id", current.user.id).maybeSingle();
  if (error || !data) return null;
  return { supabase, business: data, ownerId: current.user.id };
}

export async function businessPhotos(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  businessId: string, coverKey: string | null,
): Promise<BusinessPhoto[]> {
  const { data, error } = await supabase.from("media_assets")
    .select("id, original_filename, object_key")
    .eq("business_id", businessId).eq("status", "active").eq("visibility", "public")
    .in("category", ["business_cover", "business_gallery"]).order("created_at").order("id");
  if (error) throw new Error("Unable to load business photos.");
  return (data ?? []).map((photo) => ({
    id: String(photo.id), name: String(photo.original_filename),
    url: `/api/business-photos/${photo.id}`, isCover: photo.object_key === coverKey,
  })).sort((a, b) => Number(b.isCover) - Number(a.isCover));
}
