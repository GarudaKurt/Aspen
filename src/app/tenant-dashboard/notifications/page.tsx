import { getSubscription, getPayments } from "@/features/billing/api/queries";
import { billingDateLabel, cycleState } from "@/features/billing/mappers";
import { paymentLabels } from "@/features/billing/types";
import {
  NotificationCenter,
  type AppNotification,
} from "@/features/notifications";
import { getDashboardBusiness } from "@/features/tenant-dashboard/overview-data";
import { CALENDAR_TIME_ZONE } from "@/features/tenant-calendar/dates";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export default async function TenantNotificationsPage() {
  const business = await getDashboardBusiness();
  let failed = Boolean(business.error);
  let notifications: AppNotification[] = [];
  if (business.data) {
    const db = await createSupabaseServerClient();
    const [bookings, subscription, payments] = await Promise.all([
      db
        .from("appointments")
        .select("id, service_name, customer_name, created_at")
        .eq("business_uuid", business.data.id)
        .order("created_at", { ascending: false })
        .order("id")
        .limit(30),
      getSubscription(business.data.id),
      getPayments(business.data.id, 1),
    ]);
    const { data, error } = bookings;
    failed = Boolean(error);
    const format = new Intl.DateTimeFormat("en-PH", {
      timeZone: CALENDAR_TIME_ZONE,
      dateStyle: "medium",
      timeStyle: "short",
    });
    const updates = (payments.data ?? []).map((p) => ({
      id: p.id + p.status,
      kind: "Payments" as const,
      title: p.reactivated
        ? "Payment approved and subscription reactivated"
        : p.status === "paid" ? (p.settles_invoice ? "Invoice paid" : "Partial payment verified") : paymentLabels[p.status],
      detail: [p.reference, p.feedback].filter(Boolean).join(" · "),
      at: p.reviewed_at ?? p.submitted_at,
      href: `/tenant-dashboard/billing/invoices/${p.invoice_id}`,
    }));
    notifications = [
      ...updates,
      ...(data ?? []).map((row) => ({
        id: row.id,
        kind: "Bookings" as const,
        title: "Booking request received",
        detail: [row.customer_name, row.service_name]
          .filter(Boolean)
          .join(" · "),
        at: row.created_at,
        href: "/tenant-dashboard/appointments",
      })),
    ]
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
      .map((item) => ({
        ...item,
        timestamp: format.format(new Date(item.at)),
      }));
    const s = subscription.data;
    if (s?.due_on) {
      const cycle = cycleState(s);
      if (cycle.reminder)
        notifications.unshift({
          id: "cycle-" + s.due_on + cycle.status,
          kind: "Payments",
          title: cycle.suspended
            ? "Subscription suspended"
            : s.renew && s.upcoming_plan === "Free"
              ? "Plan change scheduled"
              : s.renew
                ? "Upcoming payment"
                : "Subscription ending",
          detail: cycle.reminder,
          timestamp: billingDateLabel(s.due_on),
          href: "/tenant-dashboard/billing",
        });
    }
    if (subscription.error || payments.error)
      notifications.unshift({
        id: "billing-unavailable",
        kind: "System",
        title: "Billing updates unavailable",
        detail: "Open Billing to check your subscription.",
        timestamp: "",
        href: "/tenant-dashboard/billing",
      });
  }
  return (
    <>
      {failed && (
        <p role="alert" className="mb-3">
          Booking notifications could not be loaded. Refresh to try again.
        </p>
      )}
      <NotificationCenter audience="provider" notifications={notifications} />
    </>
  );
}
