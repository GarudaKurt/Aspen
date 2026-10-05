"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";

import { AspenLogo } from "@/components/brand/aspen-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { subscriptionPlans } from "../data/plans";

export function SubscriptionPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  return (
    <main className="min-h-screen bg-white text-[#171817]">
      <header className="border-b border-[#e5e8e5]">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
          <a href="/" className="flex items-center gap-2 rounded-md text-lg font-bold tracking-tight text-[#3c6355] outline-none transition-colors hover:text-[#2f5044] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40 sm:text-xl" aria-label="Aspen home">
            <AspenLogo size={36} decorative className="size-9" />
            <span>Aspen</span>
          </a>
          <a href="/" className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold text-[#3c6355] transition-colors hover:bg-[#f1f6f3]">
            Back to Aspen
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 pb-16 pt-12 sm:px-8 sm:pt-16 lg:px-10 lg:pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#d6794f]">Business listing</p>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-[#3c6355] sm:text-5xl lg:text-6xl">Choose a plan that fits your business</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#69716c] sm:text-lg">Start with a free listing, then unlock the tools your pet-service business needs as it grows.</p>

          <div className="mt-8 inline-flex items-center rounded-full border border-[#dfe6e1] bg-[#f7faf8] p-1 text-sm font-semibold" aria-label="Billing period">
            <button type="button" onClick={() => setBillingPeriod("monthly")} aria-pressed={billingPeriod === "monthly"} className={`rounded-full px-4 py-2 transition-colors ${billingPeriod === "monthly" ? "bg-[#3c6355] text-white" : "text-[#68736d] hover:text-[#3c6355]"}`}>
              Pay monthly
            </button>
            <button type="button" onClick={() => setBillingPeriod("yearly")} aria-pressed={billingPeriod === "yearly"} className={`rounded-full px-4 py-2 transition-colors ${billingPeriod === "yearly" ? "bg-[#3c6355] text-white" : "text-[#68736d] hover:text-[#3c6355]"}`}>
              Pay yearly <span className="ml-1 text-[10px] text-[#d6794f]">save 20%</span>
            </button>
          </div>
          <p className="mt-2 text-xs text-[#88918b]">Pricing is shown per month. Annual billing will be configured when payments are enabled.</p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {subscriptionPlans.map((plan) => (
            <Card key={plan.name} className={`relative flex flex-col rounded-2xl p-6 shadow-[0_8px_28px_rgba(60,99,85,0.08)] transition-transform hover:-translate-y-1 ${plan.highlighted ? "border-[#3c6355] bg-[#f6faf7]" : "border-[#dfe5e1] bg-white"}`}>
              {plan.badge ? <span className="absolute right-5 top-5 rounded-full bg-[#d6794f] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">{plan.badge}</span> : null}
              <div className="min-h-24 text-left">
                <div className="text-sm font-semibold text-[#69716c]">{plan.name}</div>
                <p className="mt-3 text-3xl font-bold text-[#3c6355]">{plan.price}<span className="ml-1 text-sm font-medium text-[#7c8780]">/month</span></p>
              </div>
              <p className="mt-4 min-h-12 text-left text-sm leading-5 text-[#7c8780]">{plan.description}</p>
              <Button type="button" variant={plan.highlighted ? "default" : "outline"} className={`mt-6 min-h-11 w-full rounded-xl ${plan.highlighted ? "bg-[#3c6355] text-white hover:bg-[#2f5044]" : "border-[#3c6355] text-[#3c6355] hover:bg-[#eef5f0]"}`}>
                {plan.cta}
              </Button>
              <ul className="mt-7 space-y-3 border-t border-[#e5eae6] pt-6 text-left text-sm text-[#5f6963]">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-[#3c6355]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        <button type="button" className="mx-auto mt-10 flex items-center gap-2 rounded-lg border border-[#cbd7cf] px-5 py-3 text-sm font-semibold text-[#3c6355] transition-colors hover:bg-[#f5f9f6]">
          View features in detail <ChevronDown size={16} />
        </button>
        <p className="mt-5 text-center text-xs text-[#88918b]">Plan selection and payment activation will be connected when billing is implemented.</p>
      </section>
    </main>
  );
}
