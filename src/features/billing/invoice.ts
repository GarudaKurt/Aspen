import { billingDateLabel, money } from "./mappers";
import {
  methodLabels,
  paymentLabels,
  type Invoice,
  type Payment,
} from "./types";
import { manilaDate } from "@/features/tenant-calendar/dates";

export const invoiceNumber = (i: Pick<Invoice, "number">) =>
  "ASP-" + String(i.number).padStart(7, "0");
export const invoicePath = (id: string) =>
  "/tenant-dashboard/billing/invoices/" + id;
export const outstanding = (
  i: Pick<Invoice, "status" | "amount_php" | "credited_php">,
) =>
  i.status === "open"
    ? Math.round((i.amount_php - i.credited_php) * 100) / 100
    : 0;
export function invoiceStatus(i: Invoice, pending = false) {
  if (i.status === "void") return "Voided";
  if (i.status === "paid") return "Paid";
  if (pending) return "Pending verification";
  if (i.due_on < manilaDate()) return "Overdue";
  return i.credited_php > 0 ? "Partially paid" : "Open";
}
export function invoiceStatement(i: Invoice, payments: Payment[]) {
  return [
    "Aspen subscription invoice " + invoiceNumber(i),
    "Issued " + billingDateLabel(manilaDate(i.issued_at)),
    "Billed to " + i.billed_to,
    ...[i.billing_name, i.billing_address, i.billing_email].filter(Boolean),
    "Billing period " +
      billingDateLabel(i.period_start) +
      " – " +
      billingDateLabel(i.period_end),
    "Payment due " + billingDateLabel(i.due_on),
    "Status · " +
      invoiceStatus(
        i,
        payments.some((p) => p.status === "pending"),
      ),
    "",
    "1 × " + i.plan + " monthly subscription · " + money(i.amount_php),
    "Total · " + money(i.amount_php),
    "Balance due · " + money(outstanding(i)),
    "",
    "Payment records",
    ...(payments.length
      ? payments.flatMap((p) => [
          [
            billingDateLabel(p.paid_on),
            methodLabels[p.method],
            p.reference,
            money(p.amount_php),
            paymentLabels[p.status],
          ].join(" · "),
          ...(p.settles_invoice
            ? [
                "Verified coverage · " +
                  billingDateLabel(p.period_start) +
                  " – " +
                  billingDateLabel(p.period_end),
              ]
            : []),
        ])
      : ["No payment submissions."]),
  ].join("\n");
}
