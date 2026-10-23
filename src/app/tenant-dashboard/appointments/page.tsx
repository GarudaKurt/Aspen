import { MobileDashboardNav } from "@/features/tenant-dashboard/components/dashboard-shell";
import {
  AppointmentManagementPage,
} from "@/features/appointments";
import { mapAppointmentRow } from "@/features/appointments/api/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { requireRole } from "@/server/auth/guard";
import { getMyBusiness } from "@/features/tenancy/api/queries";

export const dynamic = "force-dynamic";

export default async function TenantAppointmentsPage() {
  await requireRole("provider", "/tenant-dashboard/appointments");
  const business = await getMyBusiness();
  if (!business) {
    return (
      <>
        <MobileDashboardNav />
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h1 className="text-xl font-semibold">Complete your provider profile first</h1>
          <p className="mt-2 text-sm text-slate-500">Your appointment inbox will appear after a business is connected to this provider account.</p>
        </div>
      </>
    );
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("appointments")
    .select("*")
    .eq("business_id", business.slug)
    .order("appointment_date", { ascending: true });

  return (
    <>
      <MobileDashboardNav />
      <AppointmentManagementPage
        initialAppointments={(data ?? []).map((row) => mapAppointmentRow(row))}
        businessId={business.slug}
      />
    </>
  );
}
