import { SiteHeader } from "@/components/landing/site-header";
import { CustomerBookingsPage } from "@/features/appointments/components/customer-bookings-page";
import { mapAppointmentRow } from "@/features/appointments/api/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { requireUser } from "@/server/auth/guard";

export default async function CustomerBookingsRoute() {
  const current = await requireUser("/bookings");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("customer_id", current.user.id)
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true });

  return (
    <>
      <SiteHeader />
      <CustomerBookingsPage
        initialAppointments={error ? [] : (data ?? []).map((row) => mapAppointmentRow(row))}
        loadError={error ? "We could not load your bookings. Please refresh and try again." : undefined}
      />
    </>
  );
}
