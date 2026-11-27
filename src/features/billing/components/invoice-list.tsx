import Link from "next/link";
import { Card } from "@/components/ui/card";
import { billingDateLabel, money } from "../mappers";
import {
  invoiceNumber,
  invoiceStatus,
  invoicePath,
  outstanding,
} from "../invoice";
import type { Invoice } from "../types";

export function InvoiceList({
  invoices,
  children,
  current = false,
  failed = false,
  pending = false,
}: {
  children?: React.ReactNode;
  invoices: Invoice[];
  current?: boolean;
  failed?: boolean;
  pending?: boolean;
}) {
  return (
    <Card className="min-w-0 space-y-3 p-5 shadow-none">
      <h2 className="text-lg font-semibold">
        {current ? "Current invoice" : "Invoice history"}
      </h2>
      {failed ? (
        <p role="alert">Invoices could not be loaded. Refresh to retry.</p>
      ) : invoices.length === 0 ? (
        <p className="text-sm text-slate-600">
          {current
            ? "No invoice is currently payable."
            : "No previous invoices on this page."}
        </p>
      ) : (
        <ul className="divide-y">
          {invoices.map((i) => (
            <li
              key={i.id}
              className="flex flex-wrap justify-between gap-2 py-3 text-sm"
            >
              <div className="space-y-1">
                <Link
                  className="font-semibold text-[#3c6355] underline"
                  href={invoicePath(i.id)}
                >
                  {invoiceNumber(i)}
                </Link>
                <p>
                  {i.plan} · {billingDateLabel(i.period_start)} –{" "}
                  {billingDateLabel(i.period_end)}
                </p>
                <p className="text-slate-600">
                  Due {billingDateLabel(i.due_on)}
                </p>
              </div>
              <div className="space-y-1">
                <strong>
                  {money(current ? outstanding(i) : i.amount_php)}
                </strong>
                <p>{invoiceStatus(i, pending)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {children}
    </Card>
  );
}
