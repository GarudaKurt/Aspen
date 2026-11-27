import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import type { Subscription, Payment, Invoice } from "../types";

export const getSubscription = cache(async (id: string) => {
  const db = await createSupabaseServerClient();
  return db
    .from("tenant_billing_terms")
    .select(
      "business_id,plan,monthly_php,due_on,preferred_method,renew,renewal_php,upcoming_plan,upcoming_on",
    )
    .eq("business_id", id)
    .maybeSingle<Subscription>();
});
export const getLatestPayment = cache(async (id: string) => {
  const db = await createSupabaseServerClient();
  return db
    .from("tenant_payments")
    .select("id,invoice_id,due_on,status,period_end,settles_invoice")
    .eq("business_id", id)
    .order("submitted_at", { ascending: false })
    .order("id")
    .limit(1)
    .maybeSingle<
      Pick<
        Payment,
        | "id"
        | "invoice_id"
        | "due_on"
        | "status"
        | "period_end"
        | "settles_invoice"
      >
    >();
});
export function transferInstructions() {
  return {
    cash: process.env.BILLING_CASH_INSTRUCTIONS?.trim() || "",
    maya: process.env.BILLING_MAYA_INSTRUCTIONS?.trim() || "",
    bank: process.env.BILLING_BANK_INSTRUCTIONS?.trim() || "",
    gcash: process.env.BILLING_GCASH_INSTRUCTIONS?.trim() || "",
  };
}
export const paymentFields =
  "id,invoice_id,business_id,due_on,period_start,period_end,amount_php,method,reference,paid_on,submitted_at,status,reviewed_at,feedback,reactivated,settles_invoice";
export const getPayments = cache(async (id: string, page: number) => {
  const db = await createSupabaseServerClient();
  return db
    .from("tenant_payments")
    .select(paymentFields, { count: "exact" })
    .eq("business_id", id)
    .order("submitted_at", { ascending: false })
    .order("id")
    .range((page - 1) * 20, page * 20 - 1)
    .returns<Payment[]>();
});
export function pageNumber(value?: string) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 && number <= 100000
    ? number
    : 1;
}

const invoiceFields =
  "id,number,business_id,billed_to,billing_name,billing_email,billing_address,plan,amount_php,credited_php,period_start,period_end,due_on,issued_at,status";
export async function billingInvoices(businessId: string, page: number) {
  const db = await createSupabaseServerClient();
  const base = () =>
    db
      .from("tenant_invoices")
      .select(invoiceFields, { count: "exact" })
      .eq("business_id", businessId);
  const [current, history] = await Promise.all([
    base()
      .eq("status", "open")
      .order("number", { ascending: false })
      .limit(1)
      .maybeSingle<Invoice>(),
    base()
      .neq("status", "open")
      .order("number", { ascending: false })
      .range((page - 1) * 20, page * 20 - 1)
      .returns<Invoice[]>(),
  ]);
  return { current, history };
}
export const invoiceDetail = cache(async (id: string, businessId: string) => {
  const db = await createSupabaseServerClient();
  const invoice = await db
    .from("tenant_invoices")
    .select(invoiceFields)
    .eq("business_id", businessId)
    .eq("id", id)
    .maybeSingle<Invoice>();
  if (invoice.error) throw new Error("Invoice could not be loaded.");
  if (!invoice.data) return null;
  const payments = await db
    .from("tenant_payments")
    .select(paymentFields)
    .eq("business_id", businessId)
    .eq("invoice_id", id)
    .order("submitted_at")
    .returns<Payment[]>();
  if (payments.error) throw new Error("Payment details could not be loaded.");
  return { invoice: invoice.data, payments: payments.data };
});
