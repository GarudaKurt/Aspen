import { invoiceNumber, outstanding } from "@/features/billing/invoice";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  changePlan,
  enrollBusiness,
  reviewPayment,
} from "@/features/billing/api/actions";
import { pageNumber, paymentFields } from "@/features/billing/api/queries";
import { money, billingDateLabel } from "@/features/billing/mappers";
import { methodLabels, type Payment } from "@/features/billing/types";
import { subscriptionPlans } from "@/features/subscriptions/data/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { requireRole } from "@/server/auth/guard";

const notices: Record<string, string> = {
  changed: "Renewal plan saved.",
  change_error:
    "Check enrollment and the first paid date. Resolve pending receipts or a prepaid plan change before changing the renewal plan.",
  enrolled: "Subscription enrolled.",
  reviewed: "Review saved.",
  invalid:
    "Check all fields. Rejections require a reason. Free plans have no due date.",
  unknown: "Business slug not found.",
  enrollment_error:
    "Enrollment failed. Check approval, existing enrollment and the first due date.",
  review_error:
    "The review could not be saved. Refresh to see whether another administrator reviewed it.",
};
export default async function AdminBilling({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; result?: string }>;
}) {
  await requireRole("admin", "/admin/billing");
  const params = await searchParams,
    page = pageNumber(params.page);
  const db = await createSupabaseServerClient();
  const queue = await db
    .from("tenant_payments")
    .select(paymentFields, { count: "exact" })
    .eq("status", "pending")
    .order("submitted_at")
    .order("id")
    .range((page - 1) * 20, page * 20 - 1)
    .returns<Payment[]>();
  const ids = [...new Set(queue.data?.map((p) => p.business_id))];
  const businesses = ids.length
    ? await db.from("businesses").select("id,name").in("id", ids)
    : { data: [] };
  const invoiceIds = [...new Set(queue.data?.map((p) => p.invoice_id))];
  const invoices = invoiceIds.length
    ? await db
        .from("tenant_invoices")
        .select("id,number,amount_php,credited_php,status")
        .in("id", invoiceIds)
    : { data: [] };
  const invoiceMap = new Map(invoices.data?.map((i) => [i.id, i]));
  const names = new Map(businesses.data?.map((b) => [b.id, b.name]));
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Link
        href="/admin/provider-applications"
        className="text-sm text-[#3c6355]"
      >
        Provider applications
      </Link>
      <h1 className="text-3xl font-bold">Tenant billing</h1>
      {params.result && Object.hasOwn(notices, params.result) && (
        <p role="status">{notices[params.result]}</p>
      )}
      <Card className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">Subscription management</h2>
        <form action={enrollBusiness} className="grid gap-4">
          <label>
            Business profile slug
            <Input required name="slug" maxLength={180} />
          </label>
          <fieldset>
            <legend>Monthly plan</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              {subscriptionPlans.map((plan) => (
                <label key={plan.name}>
                  <input type="radio" required name="plan" value={plan.name} />{" "}
                  {plan.name} · {plan.price}
                </label>
              ))}
            </div>
          </fieldset>
          <label>
            First due date (new paid enrollment or upgrade from Free)
            <Input type="date" name="due" />
          </label>
          <Button type="submit" className="justify-self-start">
            Confirm enrollment
          </Button>
          <Button
            type="submit"
            formAction={changePlan}
            variant="outline"
            className="justify-self-start"
          >
            Change renewal plan
          </Button>
        </form>
      </Card>
      <h2 className="text-xl font-semibold">Payments awaiting verification</h2>
      {queue.error ? (
        <p role="alert">Payment queue unavailable.</p>
      ) : !queue.data?.length ? (
        <p>No submissions awaiting review on this page.</p>
      ) : (
        queue.data.map((p) => (
          <Card id={`payment-${p.id}`} key={p.id} className="space-y-3 p-5">
            <h3 className="font-semibold">
              {names.get(p.business_id) ?? p.business_id} ·{" "}
              {money(p.amount_php)}
            </h3>
            <p>
              {methodLabels[p.method]} ·{" "}
              {p.reference ?? "No reference supplied"} · Paid{" "}
              {billingDateLabel(p.paid_on)}
            </p>
            {invoiceMap.has(p.invoice_id) && (
              <p>
                {invoiceNumber(invoiceMap.get(p.invoice_id)!)} · Outstanding{" "}
                {money(outstanding(invoiceMap.get(p.invoice_id)!))}
              </p>
            )}
            <p>Renewal due {billingDateLabel(p.due_on)}</p>
            <a
              className="text-[#3c6355] underline"
              href={`/api/billing/proofs?id=${p.id}`}
            >
              Download receipt
            </a>
            <form action={reviewPayment} className="space-y-3">
              <input type="hidden" name="id" value={p.id} />
              <label>
                Feedback (required for rejection)
                <Input name="reason" maxLength={500} />
              </label>
              <p className="text-sm text-slate-600">
                Match the submitted amount and date against the transfer or cash
                collection record before approving.
              </p>
              <div className="flex gap-3">
                <Button type="submit" name="decision" value="approve">
                  Approve payment
                </Button>
                <Button
                  type="submit"
                  variant="outline"
                  name="decision"
                  value="reject"
                >
                  Reject
                </Button>
              </div>
            </form>
          </Card>
        ))
      )}
      <nav className="flex gap-4">
        {page > 1 && <Link href={`?page=${page - 1}`}>Previous</Link>}
        {page * 20 < (queue.count ?? 0) && (
          <Link href={`?page=${page + 1}`}>Next</Link>
        )}
      </nav>
    </main>
  );
}
