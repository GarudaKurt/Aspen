import Link from "next/link";
import { notFound } from "next/navigation";
import { billingId } from "@/features/billing/schemas";
import { invoiceDetail } from "@/features/billing/api/queries";
import {
  invoiceNumber,
  invoiceStatus,
  outstanding,
} from "@/features/billing/invoice";
import { getDashboardBusiness } from "@/features/tenant-dashboard/overview-data";
import { billingDateLabel, money } from "@/features/billing/mappers";
import { methodLabels, paymentLabels } from "@/features/billing/types";
import { manilaDate } from "@/features/tenant-calendar/dates";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, business] = await Promise.all([
    params,
    getDashboardBusiness(),
  ]);
  if (business.error) throw new Error("Could not load your business.");
  if (!billingId.safeParse(id).success || !business.data) notFound();
  const detail = await invoiceDetail(id, business.data.id);
  if (!detail) notFound();
  const { invoice, payments } = detail;
  return (
    <article className="mx-auto max-w-3xl space-y-5">
      <Link href="/tenant-dashboard/billing" className="text-sm text-[#3c6355]">
        Back to billing
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">
          Invoice {invoiceNumber(detail.invoice)}
        </h1>
        <a
          href={`/api/billing/invoices/${id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Download invoice (.txt)
        </a>
      </div>
      <Card className="gap-6 p-5 shadow-none sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <section className="min-w-0 space-y-1 break-words">
            <h2 className="text-sm text-slate-600">Billed to</h2>
            <p className="font-semibold">{invoice.billed_to}</p>
            {[
              invoice.billing_name,
              invoice.billing_address,
              invoice.billing_email,
            ].map(
              (line, index) =>
                line && (
                  <p key={index} className="text-sm">
                    {line}
                  </p>
                ),
            )}
          </section>
          <dl className="grid grid-cols-[auto_1fr] content-start gap-x-4 gap-y-2 text-sm sm:justify-self-end">
            <dt>Issued</dt>
            <dd>{billingDateLabel(manilaDate(invoice.issued_at))}</dd>
            <dt>Due</dt>
            <dd>{billingDateLabel(invoice.due_on)}</dd>
            <dt>Status</dt>
            <dd className="font-semibold">
              {invoiceStatus(
                invoice,
                payments.some((p) => p.status === "pending"),
              )}
            </dd>
          </dl>
        </div>
        <section className="border-y py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">
              {invoice.plan} monthly subscription
            </h2>
            <strong>{money(invoice.amount_php)}</strong>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {billingDateLabel(invoice.period_start)} –{" "}
            {billingDateLabel(invoice.period_end)}
          </p>
        </section>
        <div className="flex justify-between gap-3">
          <span>Balance due</span>
          <strong>{money(outstanding(invoice))}</strong>
        </div>
      </Card>
      <section>
        <h2 className="mb-2 text-lg font-semibold">
          Payments for this invoice
        </h2>
        {payments.length === 0 ? (
          <p className="text-sm text-slate-600">No payments submitted.</p>
        ) : (
          <ul className="divide-y">
            {payments.map((p) => (
              <li key={p.id} className="space-y-1 py-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <strong>
                    {methodLabels[p.method]} · {money(p.amount_php)}
                  </strong>
                  <span>{paymentLabels[p.status]}</span>
                </div>
                <p className="break-words">
                  {billingDateLabel(p.paid_on)} · {p.reference}
                </p>
                {p.settles_invoice && (
                  <p>
                    Verified coverage · {billingDateLabel(p.period_start)} –{" "}
                    {billingDateLabel(p.period_end)}
                  </p>
                )}
                {p.feedback && <p className="break-words">{p.feedback}</p>}
                <a
                  className="text-[#3c6355] underline"
                  href={`/api/billing/proofs?id=${p.id}`}
                >
                  Download receipt
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
