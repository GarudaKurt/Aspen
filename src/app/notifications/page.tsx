import { SiteHeader } from "@/components/landing/site-header";
import { NotificationCenter, type AppNotification } from "@/features/notifications";
import type { AppointmentRequest } from "@/features/appointments/types";
import { mapAppointmentRow } from "@/features/appointments/api/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { requireUser } from "@/server/auth/guard";

export const dynamic = "force-dynamic";

function toCustomerNotifications(appointments: AppointmentRequest[]): AppNotification[] {
  return appointments.map((appointment) => {
    const status = appointment.status;
    const title = status === "Pending"
      ? "Appointment request sent"
      : status === "Confirmed"
        ? "Appointment confirmed"
        : status === "Rejected"
          ? "Appointment request declined"
          : status === "Cancelled"
            ? "Appointment cancelled"
            : "Appointment completed";
    const detail = status === "Pending"
      ? `${appointment.businessName ?? "Your provider"} is reviewing your request for ${appointment.serviceName}.`
      : `${appointment.businessName ?? "Your provider"} · ${appointment.serviceName} · ${appointment.appointmentDate} at ${appointment.appointmentTime}`;

    return {
      id: `appointment-${appointment.appointmentId}-${status.toLowerCase()}`,
      kind: "Appointments",
      title,
      detail,
      timestamp: appointment.appointmentDate,
      href: "/bookings",
    };
  });
}

export default async function CustomerNotificationsPage() {
  const current = await requireUser("/notifications");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("customer_id", current.user.id)
    .order("updated_at", { ascending: false });

  const notifications = error
    ? []
    : toCustomerNotifications((data ?? []).map((row) => mapAppointmentRow(row)));

  return (
    <main className="min-h-screen bg-[#fafcfb] text-[#171817]">
      <SiteHeader />
      <section className="mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-8 sm:py-12 lg:px-12">
        <NotificationCenter audience="customer" notifications={notifications} />
        {error && <p role="alert" className="mt-4 text-sm text-red-700">We could not load your notifications. Please refresh and try again.</p>}
      </section>
    </main>
  );
}
