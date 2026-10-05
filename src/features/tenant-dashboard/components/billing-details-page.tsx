"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  Banknote,
  Check,
  CreditCard,
  Download,
  Plus,
  ReceiptText,
  Smartphone,
  Trash2,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { Switch } from "@/components/ui/switch";

import { useListingStore } from "@/features/business-profile/store/onboarding.store";
import { MobileDashboardNav } from "./dashboard-shell";

type PaymentMethodType = "debit" | "credit" | "gcash";

type PaymentMethod = {
  id: string;
  type: PaymentMethodType;
  label: string;
  detail: string;
  isDefault: boolean;
};

const initialMethods: PaymentMethod[] = [
  {
    id: "gcash-1",
    type: "gcash",
    label: "GCash",
    detail: "•••• 1234",
    isDefault: true,
  },
];

const methodLabels: Record<PaymentMethodType, string> = {
  debit: "Debit Card",
  credit: "Credit Card",
  gcash: "GCash",
};

const methodIcons: Record<PaymentMethodType, LucideIcon> = {
  debit: CreditCard,
  credit: CreditCard,
  gcash: Smartphone,
};

export function BillingDetailsPage() {
  const billing = useListingStore((state) => state.billing);
  const [balance, setBalance] = useState(2500);
  const [methods, setMethods] = useState(initialMethods);
  const [addOpen, setAddOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [methodType, setMethodType] = useState<PaymentMethodType>("debit");
  const [cardholder, setCardholder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [cvv, setCvv] = useState("");
  const [expiry, setExpiry] = useState("");
  const [nextBillingDate, setNextBillingDate] = useState("November 5, 2026");
  const [autoRenew, setAutoRenew] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpMethod, setTopUpMethod] = useState("");

  const resetMethodForm = () => {
    setMethodType("debit");
    setCardholder("");
    setAccountNumber("");
    setCvv("");
    setExpiry("");
  };

  const formatCardNumber = (value: string) =>
    value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  };

  const isCardPayment = methodType === "debit" || methodType === "credit";
  const defaultMethod = methods.find((method) => method.isDefault);

  const addMethod = () => {
    const compactNumber = accountNumber.replace(/\D/g, "");
    const compactCvv = cvv.replace(/\D/g, "");
    const expiryMatch = /^(0[1-9]|1[0-2])\/([0-9]{2})$/.exec(expiry);

    if (!cardholder.trim() || compactNumber.length < (isCardPayment ? 16 : 4)) {
      toast({
        title: "Invalid payment details",
        description: isCardPayment
          ? "Enter a 16-digit card number."
          : "Enter a valid GCash number.",
        variant: "destructive",
      });
      return;
    }

    if (isCardPayment && (!expiryMatch || compactCvv.length < 3)) {
      toast({
        title: "Invalid card details",
        description: "Enter a valid expiry date and a 3 or 4-digit CVV/CVC.",
        variant: "destructive",
      });
      return;
    }
    setMethods((current) => [
      ...current.map((method) => ({ ...method, isDefault: false })),
      {
        id: `${methodType}-${Date.now()}`,
        type: methodType,
        label: methodLabels[methodType],
        detail: `•••• ${compactNumber.slice(-4)}`,
        isDefault: current.length === 0,
      },
    ]);
    if (isCardPayment) {
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + 1);
      setNextBillingDate(
        nextDate.toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
      );
    }
    setAddOpen(false);
    resetMethodForm();
    toast({
      title: isCardPayment ? "Payment successful" : "Payment method added",
      description: isCardPayment
        ? "Your payment method was saved for future billing."
        : `${methodLabels[methodType]} is ready to use.`,
      variant: "success",
    });
  };

  const makeDefault = (id: string) => {
    setMethods((current) =>
      current.map((method) => ({ ...method, isDefault: method.id === id })),
    );
    toast({ title: "Default payment method updated", variant: "success" });
  };

  const removeMethod = (id: string) => {
    setMethods((current) => {
      const remaining = current.filter((method) => method.id !== id);
      if (remaining.length && !remaining.some((method) => method.isDefault)) {
        remaining[0] = { ...remaining[0], isDefault: true };
      }
      return remaining;
    });
    toast({ title: "Payment method removed", variant: "success" });
  };

  const topUp = () => {
    const amount = Number(topUpAmount);
    if (!Number.isFinite(amount) || amount <= 0 || !topUpMethod) {
      toast({
        title: "Complete top-up details",
        description: "Choose a payment method and enter an amount greater than zero.",
        variant: "destructive",
      });
      return;
    }

    setBalance((current) => current + amount);
    setTopUpAmount("");
    setTopUpOpen(false);
    toast({
      title: "Balance top-up recorded",
      description: `₱${amount.toLocaleString()} was added in this demo.`,
      variant: "success",
    });
  };

  return (
    <>
      <MobileDashboardNav />
      <div className="space-y-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3c6355]">
            Account billing
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Billing Details</h1>
          <p className="mt-2 text-slate-500">
            Manage payment methods and keep your provider account balance ready.
          </p>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)]">
          <div className="space-y-4">

          <Card className="h-fit bg-[#3c6355] p-6 text-white shadow-none">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-white/75">Available balance</p>
                <p className="mt-3 text-4xl font-bold">₱{balance.toLocaleString()}</p>
              </div>
              <span className="grid size-12 place-items-center rounded-2xl bg-white/15">
                <WalletCards className="size-6" />
              </span>
            </div>
            <p className="mt-7 text-sm text-white/75">
              Use your balance for future listing and account charges.
            </p>
            <Button
              type="button"
              onClick={() => setTopUpOpen(true)}
              className="mt-5 bg-white text-[#3c6355] hover:bg-[#eef5f0]"
            >
              <Plus className="mr-2 size-4" />
              Top up balance
            </Button>
          </Card>


        <Card className="bg-white p-5 shadow-none sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Billing Information</h2>
              <p className="mt-1 text-sm text-slate-500">
                Details collected during your List Your Business setup.
              </p>
            </div>
            <Link
              href="/list-your-business/billing"
              className="font-semibold text-[#3c6355] hover:underline"
            >
              Edit details
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <BillingField label="Billing name" value={billing.fullName} />
            <BillingField label="Billing email" value={billing.email} />
            <BillingField label="Billing address" value={billing.address} />
          </div>
        </Card>
          </div>
          <Card className="bg-white p-6 shadow-none">
            <div className="flex items-start gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-[#3c6355]">
                <Banknote className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#587267]">
                  Current subscription
                </p>
                <h2 className="mt-1 text-xl font-semibold">Professional plan</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">Monthly billing</p>
                <p className="mt-1 font-semibold">₱999 / month</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Next billing date</p>
                <p className="mt-1 font-semibold">{nextBillingDate}</p>
              </div>
            </div>
            <div className="mt-5 rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Default payment method</p>
              <p className="mt-1 font-semibold">
                {defaultMethod
                  ? `${defaultMethod.label} ${defaultMethod.detail}`
                  : "No payment method selected"}
              </p>
            </div>
            <div className="mt-5 flex items-start justify-between gap-4 rounded-xl bg-[#f1f6f3] p-4">
              <div>
                <p className="font-semibold">Auto-Renew Subscription</p>
                <p className="mt-1 text-sm text-[#587267]">
                  {autoRenew && defaultMethod
                    ? `${defaultMethod.label} will be charged automatically each month.`
                    : "Choose a default payment method to enable automatic billing."}
                </p>
              </div>
              <Switch
                checked={autoRenew}
                onCheckedChange={(checked) => {
                  setAutoRenew(checked);
                  toast({
                    title: checked ? "Auto-renew enabled" : "Auto-renew disabled",
                    description: checked
                      ? "Your default payment method will be charged monthly."
                      : "Monthly subscription payments now require manual action.",
                    variant: "success",
                  });
                }}
                disabled={!defaultMethod}
                aria-label="Auto-Renew Subscription"
              />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-[#3c6355]">
              <Check className="size-4" />
              Billing profile active
            </div>
          </Card>
        </div>



        <Card className="bg-white p-5 shadow-none sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Payment methods</h2>
              <p className="mt-1 text-sm text-slate-500">
                Add a debit card, credit card, or GCash account for future payments.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setAddOpen(true)}
              className="bg-[#3c6355] text-white hover:bg-[#2f5044]"
            >
              <Plus className="mr-2 size-4" />
              Add payment method
            </Button>
          </div>

          <div className="mt-6 space-y-3">
            {methods.map((method) => {
              const Icon = methodIcons[method.type];
              return (
                <div
                  key={method.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-4"
                >
                  <span className="grid size-10 place-items-center rounded-lg bg-[#f1f6f3] text-[#3c6355]">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{method.label}</p>
                    <p className="text-sm text-slate-500">{method.detail}</p>
                  </div>
                  {method.isDefault ? (
                    <span className="rounded-full bg-[#e8f5ef] px-3 py-1 text-xs font-semibold text-[#3c6355]">
                      Default
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => makeDefault(method.id)}
                      className="text-sm text-[#3c6355]"
                    >
                      Make default
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${method.label}`}
                    onClick={() => removeMethod(method.id)}
                    className="text-slate-500 hover:text-red-600"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })}
            {!methods.length && (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                No payment methods added yet.
              </div>
            )}
          </div>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <Card className="bg-white p-5 shadow-none sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Billing History</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Recent subscription payments and balance top-ups.
                </p>
              </div>
              <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-[#3c6355]">
                <ReceiptText className="size-5" />
              </span>
            </div>
            <div className="mt-5 divide-y divide-slate-200">
              <BillingTransaction date="Nov 5, 2026" description="Professional plan subscription" amount="₱999" method="GCash •••• 1234" status="Paid" />
              <BillingTransaction date="Oct 5, 2026" description="Account balance top-up" amount="₱2,500" method="GCash •••• 1234" status="Completed" />
            </div>
          </Card>

          <Card className="bg-white p-5 shadow-none sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Invoices & receipts</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Access your recent billing documents.
                </p>
              </div>
              <Download className="size-5 text-[#3c6355]" />
            </div>
            <div className="mt-5 space-y-3">
              <BillingDocument label="Professional plan · Nov 2026" />
              <BillingDocument label="Balance top-up · Oct 2026" />
            </div>
          </Card>
        </div>
      </div>

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent title="Add payment method" onClose={() => setAddOpen(false)}>
          <div className="space-y-5 p-5">
            <div>
              <p className="text-sm text-slate-500">
                Payment information is not submitted in this UI preview.
              </p>
            </div>
            <Label htmlFor="payment-type">Payment type</Label>
            <Select value={methodType} onValueChange={(value) => setMethodType(value as PaymentMethodType)}>
              <SelectTrigger id="payment-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="debit">Debit Card</SelectItem>
                <SelectItem value="credit">Credit Card</SelectItem>
                <SelectItem value="gcash">GCash</SelectItem>
              </SelectContent>
            </Select>
            <div className="space-y-2">
              <Label htmlFor="cardholder">Name on account</Label>
              <Input id="cardholder" value={cardholder} onChange={(event) => setCardholder(event.target.value)} placeholder="Juan Dela Cruz" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-number">
                {isCardPayment ? "Card number" : "GCash number"}
              </Label>
              <Input
                id="account-number"
                value={isCardPayment ? formatCardNumber(accountNumber) : accountNumber}
                onChange={(event) => setAccountNumber(event.target.value)}
                inputMode="numeric"
                maxLength={isCardPayment ? 19 : undefined}
                placeholder={isCardPayment ? "1234 5678 9012 3456" : "Enter GCash number"}
              />
            </div>
            {isCardPayment && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry date</Label>
                  <Input
                    id="expiry"
                    value={expiry}
                    onChange={(event) => setExpiry(formatExpiry(event.target.value))}
                    inputMode="numeric"
                    maxLength={5}
                    placeholder="MM/YY"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV/CVC</Label>
                  <Input
                    id="cvv"
                    value={cvv}
                    onChange={(event) => setCvv(event.target.value.replace(/\D/g, "").slice(0, 4))}
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="123"
                  />
                </div>
              </div>
            )}
          </div>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="button" onClick={addMethod} className="bg-[#3c6355] text-white hover:bg-[#2f5044]">{isCardPayment ? "Pay Now" : "Save method"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={topUpOpen} onOpenChange={setTopUpOpen}>
        <SheetContent title="Top up balance" onClose={() => setTopUpOpen(false)}>
          <div className="space-y-5 p-5">
            <div>
              <h2 className="text-xl font-semibold">Top up account balance</h2>
              <p className="mt-1 text-sm text-slate-500">
                Select a saved payment method and amount for this demo.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="top-up-method">Payment method</Label>
              <Select value={topUpMethod} onValueChange={setTopUpMethod}>
                <SelectTrigger id="top-up-method"><SelectValue placeholder="Choose a method" /></SelectTrigger>
                <SelectContent>
                  {methods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>{method.label} {method.detail}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="top-up-amount">Amount</Label>
              <Input id="top-up-amount" value={topUpAmount} onChange={(event) => setTopUpAmount(event.target.value)} inputMode="decimal" placeholder="e.g. 1000" />
            </div>
          </div>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setTopUpOpen(false)}>Cancel</Button>
            <Button type="button" onClick={topUp} className="bg-[#3c6355] text-white hover:bg-[#2f5044]">Add balance</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}


function BillingField({
  label,
  value,
  className = "",
}: {
  label: string;
  value?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 p-4 ${className}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words font-semibold">{value || "Not provided"}</p>
    </div>
  );
}

function BillingTransaction({
  date,
  description,
  amount,
  method,
  status,
}: {
  date: string;
  description: string;
  amount: string;
  method: string;
  status: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0">
      <span className="grid size-9 place-items-center rounded-lg bg-[#f1f6f3] text-[#3c6355]">
        <ArrowUpRight className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{description}</p>
        <p className="text-sm text-slate-500">{date} · {method}</p>
      </div>
      <div className="text-right">
        <p className="font-semibold">{amount}</p>
        <p className="text-xs font-semibold text-[#3c6355]">{status}</p>
      </div>
    </div>
  );
}

function BillingDocument({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
      <ReceiptText className="size-4 shrink-0 text-[#3c6355]" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-[#3c6355]"
      >
        View <ArrowUpRight className="size-3" />
      </Button>
    </div>
  );
}
