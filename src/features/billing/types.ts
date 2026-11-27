export type Method = "bank" | "gcash" | "maya" | "cash" | "card";
export type Subscription = {
  business_id: string;
  plan: string;
  monthly_php: number;
  renewal_php: number;
  upcoming_plan: string | null;
  upcoming_on: string | null;
  due_on: string | null;
  preferred_method: Method | null;
  renew: boolean;
};
export type Payment = {
  invoice_id: string;
  id: string;
  business_id: string;
  due_on: string;
  period_start: string;
  period_end: string;
  amount_php: number;
  method: Method;
  reference: string | null;
  settles_invoice: boolean;
  paid_on: string;
  submitted_at: string;
  status: "pending" | "paid" | "rejected";
  reviewed_at: string | null;
  feedback: string | null;
  reactivated: boolean;
};
export const methodLabels = {
  card: "Credit/debit card",
  bank: "Bank transfer",
  gcash: "GCash",
  maya: "Maya",
  cash: "Direct cash",
};
export const paymentLabels = {
  pending: "Pending verification",
  paid: "Verified",
  rejected: "Rejected",
};

export type Invoice = {
  id: string;
  number: number;
  business_id: string;
  credited_php: number;
  billed_to: string;
  billing_name: string | null;
  billing_email: string | null;
  billing_address: string | null;
  plan: string;
  amount_php: number;
  period_start: string;
  period_end: string;
  due_on: string;
  issued_at: string;
  status: "open" | "paid" | "void";
};
