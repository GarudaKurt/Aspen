"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { changePreference } from "../api/actions";
import { methodLabels, type Method, type Subscription } from "../types";

export function BillingControls({
  subscription: s,
  locked,
}: {
  subscription: Subscription;
  locked: boolean;
}) {
  const [method, setMethod] = useState<Method>(s.preferred_method ?? "bank");
  return (
    <Card className="space-y-5 p-5 shadow-none">
      <h2 className="text-lg font-semibold">Billing preferences</h2>
      <form
        action={changePreference}
        className="flex flex-wrap items-center justify-between gap-3 border-b pb-4"
        onSubmit={(event) => {
          if (
            !window.confirm(
              s.renew
                ? "Turn off renewal? Access continues through the current due date. After that, paid tools and your public listing will be suspended."
                : "Enable renewal? You can submit a manual payment for the next month.",
            )
          )
            event.preventDefault();
        }}
      >
        <p>
          Renewal preference <strong>{s.renew ? "On" : "Off"}</strong>
        </p>
        <input type="hidden" name="renew" value={s.renew ? "off" : "on"} />
        <Button variant="outline" type="submit" disabled={locked}>
          {s.renew ? "Turn off renewal" : "Enable renewal"}
        </Button>
      </form>
      <form action={changePreference} className="space-y-3">
        <fieldset>
          <legend className="mb-2 font-medium">Preferred payment method</legend>
          <div className="flex flex-wrap gap-4">
            {(Object.keys(methodLabels) as Method[]).map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="method"
                  value={key}
                  checked={key === method}
                  onChange={() => setMethod(key)}
                />
                {methodLabels[key]}
              </label>
            ))}
          </div>
        </fieldset>
        <Button
          variant="outline"
          type="submit"
          disabled={s.preferred_method === method}
        >
          Save preference
        </Button>
      </form>
      {locked && (
        <p className="text-sm text-slate-600">
          Renewal changes are available after this invoice’s payment is
          resolved.
        </p>
      )}
    </Card>
  );
}
