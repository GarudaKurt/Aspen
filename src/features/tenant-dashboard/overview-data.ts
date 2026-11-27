import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { requireRole } from "@/server/auth/guard";

// Shared by the shell and the active page, only within this authenticated request.
export const getDashboardBusiness = cache(async () => {
  const current = await requireRole("provider", "/tenant-dashboard");
  const db = await createSupabaseServerClient();
  return db.from("businesses").select("id, name, status, cover_photo_path")
    .eq("owner_id", current.user.id).order("created_at").order("id").limit(1).maybeSingle();
});

export async function getDashboardOverview(businessId: string) {
  const db = await createSupabaseServerClient();
  const bookings = () => db.from("appointments")
    .select("id, service_name, pet_name, customer_name, starts_at", { count: "exact" })
    .eq("business_uuid", businessId);
  const [pending, upcoming, unread] = await Promise.all([
    bookings().eq("status", "Pending").order("created_at").order("id").limit(5),
    bookings().eq("status", "Confirmed").gte("starts_at", new Date().toISOString())
      .order("starts_at").order("id").limit(5),
    db.rpc("provider_unread_messages", { p_business_id: businessId }),
  ]);
  return {
    pending: { rows: pending.data, count: pending.error ? null : pending.count },
    upcoming: { rows: upcoming.data, count: upcoming.error ? null : upcoming.count },
    unread: unread.error || typeof unread.data !== "number" ? null : unread.data,
  };
}
