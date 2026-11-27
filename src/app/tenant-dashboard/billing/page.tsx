import { PaymentProofSheet } from "@/features/billing/components/payment-proof-sheet";
import { InvoiceList } from "@/features/billing/components/invoice-list";
import { invoicePath, outstanding } from "@/features/billing/invoice";
import Link from "next/link";
import { BillingControls } from "@/features/billing/components/billing-controls";
import { CurrentPlanCard } from "@/features/billing/components/current-plan-card";
import {
  billingInvoices,
  getLatestPayment,
  getPayments,
  getSubscription,
  pageNumber,
  transferInstructions,
} from "@/features/billing/api/queries";
import {
  billingDateLabel,
  cycleState,
  money,
} from "@/features/billing/mappers";
import { methodLabels, paymentLabels } from "@/features/billing/types";
import { getDashboardBusiness } from "@/features/tenant-dashboard/overview-data";
import { manilaDate } from "@/features/tenant-calendar/dates";
import { Card } from "@/components/ui/card";

export default async function TenantBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; invoices?: string; result?: string }>;
}) {
  const [{ data: business, error }, params] = await Promise.all([
    getDashboardBusiness(),
    searchParams,
  ]);
  if (!business)
    return (
      <section>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p>
          {error
            ? "Billing could not be loaded."
            : "No business is connected to your account."}
        </p>
      </section>
    );
  const page = pageNumber(params.page);
  const invoicePage = pageNumber(params.invoices);
  const [subscription, history, latest, invoices] = await Promise.all([
    getSubscription(business.id),
    getPayments(business.id, page),
    getLatestPayment(business.id),
    billingInvoices(business.id, invoicePage),
  ]);
  const s = subscription.data;
  const current = invoices.current.data;
  const pending =
    latest.data?.status === "pending" && latest.data.invoice_id === current?.id;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="mt-1 text-slate-600">{business.name}</p>
      </header>
      {params.result && (
        <p role="status">
          {params.result === "saved"
            ? "Billing preferences saved."
            : "Your change could not be saved. Review the details and retry."}
        </p>
      )}
      <CurrentPlanCard
        subscription={s}
        payment={latest.data}
        paymentFailed={Boolean(latest.error)}
        failed={Boolean(subscription.error)}
      />
      <InvoiceList
        current
        pending={pending}
        invoices={invoices.current.data ? [invoices.current.data] : []}
        failed={Boolean(invoices.current.error)}
      >
        {current && s?.renew && !latest.error && (
          <PaymentProofSheet
            key={current.id + "-" + latest.data?.id + "-" + latest.data?.status}
            invoice={current}
            preferred={s.preferred_method}
            today={manilaDate()}
            instructions={transferInstructions()}
            pending={pending}
          />
        )}
      </InvoiceList>
      {s && s.monthly_php > 0 && !latest.error && (
        <BillingControls
          subscription={s}
          locked={pending || Boolean(current?.credited_php)}
        />
      )}
      <InvoiceList
        invoices={invoices.history.data ?? []}
        failed={Boolean(invoices.history.error)}
      />
      {(invoicePage > 1 ||
        invoicePage * 20 < (invoices.history.count ?? 0)) && (
        <nav
          aria-label="Invoice history pages"
          className="flex gap-4 text-sm text-[#3c6355]"
        >
          {invoicePage > 1 && (
            <Link href={`?invoices=${invoicePage - 1}&page=${page}`}>
              Previous invoices
            </Link>
          )}
          {invoicePage * 20 < (invoices.history.count ?? 0) && (
            <Link href={`?invoices=${invoicePage + 1}&page=${page}`}>
              Next invoices
            </Link>
          )}
        </nav>
      )}
      <Card className="space-y-4 p-5 shadow-none">
        <h2 className="text-lg font-semibold">Payment history</h2>
        {current && s?.due_on && cycleState(s).suspended && s.renew && (
          <p className="text-sm text-amber-800">
            Overdue · {money(outstanding(current))} due{" "}
            {billingDateLabel(s.due_on)}
            {pending && " · Receipt awaiting verification"}
          </p>
        )}
        {history.error ? (
          <p role="alert">
            Payment history could not be loaded. Refresh to retry.
          </p>
        ) : !history.data?.length ? (
          <p className="text-sm text-slate-600">
            {page === 1
              ? "No payment submissions yet."
              : "No payments on this page."}
          </p>
        ) : (
          <ul className="divide-y">
            {history.data.map((p) => (
              <li
                key={p.id}
                className="grid gap-2 py-4 text-sm sm:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0 space-y-1">
                  <strong className="break-all">
                    {p.reference || methodLabels[p.method]}
                  </strong>{" "}
                  ·{" "}
                  <Link className="underline" href={invoicePath(p.invoice_id)}>
                    View invoice
                  </Link>
                  <p>
                    {methodLabels[p.method]} · Payment date{" "}
                    {billingDateLabel(p.paid_on)}
                  </p>
                  <p className="text-slate-600">
                    {p.settles_invoice ? "Billing period" : "Requested period"}{" "}
                    · {billingDateLabel(p.period_start)} –{" "}
                    {billingDateLabel(p.period_end)}
                  </p>
                  {p.feedback && (
                    <p className="break-words">
                      Review feedback · {p.feedback}
                    </p>
                  )}
                </div>
                <div className="space-y-1 sm:text-right">
                  <strong>{money(p.amount_php)}</strong>
                  <p>{paymentLabels[p.status]}</p>
                  <a
                    className="text-[#3c6355] underline"
                    href={`/api/billing/proofs?id=${p.id}`}
                  >
                    Download receipt
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
        <nav
          aria-label="Payment history pages"
          className="flex gap-4 text-sm text-[#3c6355]"
        >
          {page > 1 && (
            <Link href={`?page=${page - 1}&invoices=${invoicePage}`}>
              Previous
            </Link>
          )}
          {page * 20 < (history.count ?? 0) && (
            <Link href={`?page=${page + 1}&invoices=${invoicePage}`}>Next</Link>
          )}
        </nav>
      </Card>
      <Link className="text-sm font-semibold text-[#3c6355]" href="/help">
        Billing support
      </Link>
    </div>
  );
}
