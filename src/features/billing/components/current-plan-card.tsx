import { subscriptionPlans } from "@/features/subscriptions/data/plans";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { billingDateLabel, cycleState, money } from "../mappers";
import { paymentLabels, type Payment, type Subscription } from "../types";

export function CurrentPlanCard({
  subscription: s,
  overview = false,
  failed = false,
  payment,
  paymentFailed = false,
}: {
  subscription: Subscription | null;
  overview?: boolean;
  failed?: boolean;
  payment?: Pick<
    Payment,
    "due_on" | "status" | "period_end" | "settles_invoice"
  > | null;
  paymentFailed?: boolean;
}) {
  const state = s && cycleState(s);
  const submitted = payment && payment.due_on === s?.due_on;
  let paymentStatus = "Upcoming";
  if (!s?.due_on || !s.renew || !s.renewal_php)
    paymentStatus = "No payment scheduled";
  if (payment?.status === "paid" && payment.period_end === s?.due_on)
    paymentStatus = "Current term paid";
  if (state?.suspended && s?.renew) paymentStatus = "Overdue";
  if (submitted && payment)
    paymentStatus =
      payment.status === "paid" && !payment.settles_invoice
        ? "Partially paid"
        : paymentLabels[payment.status];
  if (paymentFailed) paymentStatus = "Unavailable";
  return (
    <Card className="space-y-4 bg-white p-5 shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {overview ? "Next billing cycle" : "Subscription"}
        </h2>
        {overview && (
          <Link
            className="text-sm font-semibold text-[#3c6355] hover:underline"
            href="/tenant-dashboard/billing"
          >
            Manage billing
          </Link>
        )}
      </div>
      {failed ? (
        <p role="alert">Billing details could not be loaded.</p>
      ) : !s || !state ? (
        <p className="text-sm text-slate-600">
          No subscription has been enrolled. An administrator will confirm your
          plan and first due date.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-3">
            <strong className="text-2xl">{s.plan}</strong>
            <span
              className={
                state.suspended
                  ? "font-medium text-red-700"
                  : "font-medium text-[#3c6355]"
              }
            >
              {state.status}
            </span>
          </div>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-slate-600">Payment status</dt>
              <dd>{paymentStatus}</dd>
            </div>
            <div>
              <dt className="text-slate-600">Monthly price</dt>
              <dd>{money(s.monthly_php)}</dd>
            </div>
            <div>
              <dt className="text-slate-600">
                {s.renew ? "Renewal amount" : "Optional renewal"}
              </dt>
              <dd>{money(s.renewal_php)}</dd>
            </div>
            <div>
              <dt className="text-slate-600">
                {s.renew && s.renewal_php
                  ? "Next renewal due"
                  : "Current term through"}
              </dt>
              <dd>
                {s.due_on ? billingDateLabel(s.due_on) : "No payment due"}
              </dd>
            </div>
          </dl>
          {s.upcoming_plan && s.upcoming_on && (
            <p className="text-sm">
              Next plan · {s.upcoming_plan} from{" "}
              {billingDateLabel(s.upcoming_on)}
            </p>
          )}
          {!overview && (
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold">
                Included features
              </summary>
              <ul className="mt-2 list-disc pl-5">
                {subscriptionPlans
                  .find((plan) => plan.name === s.plan)
                  ?.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
              </ul>
            </details>
          )}
          {state.reminder && (
            <p className="rounded-lg bg-slate-50 p-3 text-sm">
              {state.reminder}
            </p>
          )}
          {state.suspended && (
            <Link className="text-sm font-semibold text-[#3c6355]" href="/help">
              Contact support
            </Link>
          )}
        </>
      )}
    </Card>
  );
}
