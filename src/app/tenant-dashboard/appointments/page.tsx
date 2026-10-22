import { MobileDashboardNav } from "@/features/tenant-dashboard/components/dashboard-shell";
import {
  AppointmentManagementPage,
  tenantBusinessId,
} from "@/features/appointments";
import { mapAppointmentRow } from "@/features/appointments/api/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { requireRole } from "@/server/auth/guard";

export default async function TenantAppointmentsPage() {
  await requireRole("provider", "/tenant-dashboard/appointments");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("appointments")
    .select("*")
    .eq("business_id", tenantBusinessId)
    .order("appointment_date", { ascending: true });

  return (
    <>
      <MobileDashboardNav />
      <AppointmentManagementPage
        initialAppointments={(data ?? []).map((row) => mapAppointmentRow(row))}
        businessId={tenantBusinessId}
      />
    </>
  );
}
