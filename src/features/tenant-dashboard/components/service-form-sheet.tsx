"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetFooter } from "@/components/ui/sheet";
import type { ServiceItem, ServiceStatus } from "../types";

type ServiceDraft = Omit<ServiceItem, "id">;

const emptyDraft: ServiceDraft = { title: "", category: "Grooming", description: "", price: "", duration: "", image: "", status: "Draft" };

export function ServiceFormSheet({ open, service, onClose, onSave }: { open: boolean; service: ServiceItem | null; onClose: () => void; onSave: (draft: ServiceDraft) => void }) {
  const [draft, setDraft] = useState<ServiceDraft>(emptyDraft);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) setDraft(service ? { title: service.title, category: service.category, description: service.description, price: service.price, duration: service.duration, image: service.image ?? "", status: service.status } : emptyDraft);
    setError("");
  }, [open, service]);

  const update = (field: keyof ServiceDraft, value: string) => setDraft((current) => ({ ...current, [field]: value }));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.description.trim() || !draft.price.trim()) {
      setError("Add a service name, description, and starting price.");
      return;
    }
    onSave({ ...draft, title: draft.title.trim(), description: draft.description.trim(), price: draft.price.trim(), duration: draft.duration.trim() || "By appointment", status: draft.status as ServiceStatus });
  };

  return <Sheet open={open} onOpenChange={(value) => !value && onClose()}>
    <SheetContent title={service ? "Edit service" : "Add service"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-1 flex-col">
        <div className="space-y-5 p-5">
          <div><Label htmlFor="service-title">Service name</Label><Input id="service-title" value={draft.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Full Grooming Package" className="mt-2" /></div>
          <div><Label htmlFor="service-category">Category</Label><select id="service-category" value={draft.category} onChange={(event) => update("category", event.target.value)} className="mt-2 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option>Veterinary</option><option>Grooming</option><option>Boarding</option></select></div>
          <div><Label htmlFor="service-description">Description</Label><textarea id="service-description" value={draft.description} onChange={(event) => update("description", event.target.value)} placeholder="Describe what customers can expect." className="mt-2 min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#3c6355]" /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="service-price">Starting price</Label><Input id="service-price" value={draft.price} onChange={(event) => update("price", event.target.value)} placeholder="₱500" className="mt-2" /></div><div><Label htmlFor="service-duration">Duration</Label><Input id="service-duration" value={draft.duration} onChange={(event) => update("duration", event.target.value)} placeholder="60 min" className="mt-2" /></div></div>
          <div><Label htmlFor="service-image">Service image URL <span className="font-normal text-slate-400">(optional)</span></Label><Input id="service-image" value={draft.image} onChange={(event) => update("image", event.target.value)} placeholder="https://..." className="mt-2" /></div>
          <div><Label htmlFor="service-status">Availability</Label><select id="service-status" value={draft.status} onChange={(event) => update("status", event.target.value)} className="mt-2 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="Active">Published and available</option><option value="Draft">Draft</option><option value="Paused">Paused</option></select></div>
          {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>
        <SheetFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" className="bg-[#3c6355] text-white hover:bg-[#2f5044]">Save service</Button></SheetFooter>
      </form>
    </SheetContent>
  </Sheet>;
}
