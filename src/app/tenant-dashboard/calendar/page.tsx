import { CalendarView } from "@/features/tenant-dashboard/components/calendar-view";
import { requireRole } from "@/server/auth/guard";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { manilaDate } from "@/features/tenant-calendar/dates";

export const dynamic = "force-dynamic";

export default async function TenantCalendarPage() {
  const current = await requireRole("provider", "/tenant-dashboard/calendar");
  const supabase = await createSupabaseServerClient();
  const { data: business, error } = await supabase.from("businesses").select("id, name")
    .eq("owner_id", current.user.id).order("created_at").limit(1).maybeSingle();
  if (error) throw new Error("Unable to load your business calendar.");
  if (!business) return <p className="rounded-xl border p-6 text-slate-500">Your calendar will be available after your business application is approved.</p>;
  return <CalendarView businessId={business.id} businessName={business.name} initialDate={manilaDate()} />;
}
