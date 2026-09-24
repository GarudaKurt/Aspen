"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { ServiceItem } from "../types";

export function ServicePreviewSheet({ service, onClose }: { service: ServiceItem | null; onClose: () => void }) {
  return <Sheet open={Boolean(service)} onOpenChange={(open) => !open && onClose()}>
    {service && <SheetContent title="Customer preview" onClose={onClose}>
      <div className="p-5">
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          {service.image ? <img src={service.image} alt="" className="h-48 w-full object-cover" /> : <div className="grid h-48 place-items-center bg-[#e8f5ef] text-5xl font-bold text-[#3c6355]">{service.title.charAt(0)}</div>}
          <div className="space-y-3 p-5">
            <div className="flex items-start justify-between gap-3"><div><p className="text-sm text-[#3c6355]">{service.category}</p><h3 className="text-xl font-semibold">{service.title}</h3></div><span className="font-semibold text-[#3c6355]">{service.price}</span></div>
            <p className="text-sm leading-6 text-slate-600">{service.description}</p>
            <div className="flex items-center justify-between border-t pt-3 text-sm text-slate-500"><span>{service.duration}</span><span>{service.status === "Active" ? "Available to book" : "Currently unavailable"}</span></div>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">This is how customers will see this service.</p>
      </div>
      <div className="mt-auto border-t p-5"><Button type="button" variant="outline" className="w-full" onClick={onClose}>Close preview</Button></div>
    </SheetContent>}
  </Sheet>;
}
