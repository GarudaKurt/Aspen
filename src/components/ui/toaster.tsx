"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dismissToast, useToastItems } from "./toast";

export function Toaster() {
  const items = useToastItems();

  return (
    <div className="fixed bottom-4 right-4 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className={`rounded-lg border bg-white p-4 shadow-lg ${item.variant === "destructive" ? "border-red-200" : item.variant === "success" ? "border-emerald-200" : "border-slate-200"}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{item.title}</p>
              {item.description && <p className="mt-1 text-xs text-slate-500">{item.description}</p>}
            </div>
            <Button type="button" variant="ghost" size="icon-xs" onClick={() => dismissToast(item.id)} aria-label="Dismiss notification">
              <X />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
