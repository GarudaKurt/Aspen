import {
  addDays,
  dateLabel,
  manilaDate,
} from "@/features/tenant-calendar/dates";
import type { Subscription } from "./types";

export const money = (value: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    value,
  );
export const billingDateLabel = (date: string) =>
  dateLabel(date, { year: "numeric", month: "short", day: "numeric" });

export function cycleState(s: Subscription, today = manilaDate()) {
  if (!s.due_on)
    return {
      status: "Active",
      reminder: "This plan has no recurring payment.",
      suspended: false,
    };
  const days = Math.round(
    (Date.parse(s.due_on) - Date.parse(today)) / 86400000,
  );
  if (days < 0) {
    const start = addDays(s.due_on, 1);
    const retention = new Date(start + "T00:00:00Z");
    const day = retention.getUTCDate();
    retention.setUTCDate(1);
    retention.setUTCMonth(retention.getUTCMonth() + 3);
    retention.setUTCDate(0);
    retention.setUTCDate(Math.min(day, retention.getUTCDate()));
    const end = retention.toISOString().slice(0, 10);
    const remaining = Math.max(
      0,
      Math.round((Date.parse(end) - Date.parse(today)) / 86400000),
    );
    return {
      suspended: true,
      status: "Suspended",
      reminder: `${s.renew ? "Payment overdue." : "Renewal was turned off."} Suspended since ${billingDateLabel(start)}. ${remaining ? `${remaining} days remain in the retention period, through ${billingDateLabel(addDays(end, -1))}.` : "The two-month retention period has ended. Your data is retained for account review."} Verified renewal restores eligible services.`,
    };
  }
  return {
    suspended: false,
    status: s.renew ? "Active" : "Ending",
    reminder:
      s.renew && s.upcoming_plan === "Free" && s.upcoming_on
        ? `Your Free plan begins on ${billingDateLabel(s.upcoming_on)}. No renewal payment is due.`
        : !s.renew
          ? `Renewal is off. Access continues through ${billingDateLabel(s.due_on)}.`
          : days <= 7
            ? days === 0
              ? "Your renewal payment is due today."
              : `Your renewal payment is due in ${days} days.`
            : "",
  };
}
