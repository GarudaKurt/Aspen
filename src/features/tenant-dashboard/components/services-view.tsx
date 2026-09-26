"use client";

import { useState } from "react";
import { Eye, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ServiceFormSheet } from "./service-form-sheet";
import { ServicePreviewSheet } from "./service-preview-sheet";
import type { ServiceItem } from "../types";

type ServiceDraft = Omit<ServiceItem, "id">;

function statusClass(status: ServiceItem["status"]) {
  return status === "Active"
    ? "bg-emerald-50 text-emerald-700"
    : status === "Draft"
      ? "bg-sky-50 text-sky-700"
      : "bg-orange-50 text-orange-700";
}

export function ServicesView({
  initialServices,
}: {
  initialServices: ServiceItem[];
}) {
  const [items, setItems] = useState(initialServices);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [previewing, setPreviewing] = useState<ServiceItem | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (service: ServiceItem) => {
    setEditing(service);
    setFormOpen(true);
  };
  const save = (draft: ServiceDraft) => {
    if (editing)
      setItems((current) =>
        current.map((service) =>
          service.id === editing.id ? { ...draft, id: editing.id } : service,
        ),
      );
    else
      setItems((current) => [
        ...current,
        { ...draft, id: crypto.randomUUID() },
      ]);
    setFormOpen(false);
  };
  const remove = (id: string) => {
    if (window.confirm("Delete this service?"))
      setItems((current) => current.filter((service) => service.id !== id));
  };
  const toggle = (id: string) =>
    setItems((current) =>
      current.map((service) =>
        service.id === id
          ? {
              ...service,
              status: service.status === "Active" ? "Paused" : "Active",
            }
          : service,
      ),
    );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Services</h1>
          <p className="mt-1 text-slate-500">
            Manage what you offer and how it appears to customers.
          </p>
        </div>
        <Button
          type="button"
          onClick={openCreate}
          className="bg-[#3c6355] text-white hover:bg-[#2f5044]"
        >
          <Plus className="mr-2 size-4" />
          Add service
        </Button>
      </div>
      {items.length ? (
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {items.map((service) => (
            <Card key={service.id} className="bg-white p-5 shadow-none">
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#3c6355]">
                      {service.category}
                    </p>
                    <h2 className="truncate text-lg font-semibold">
                      {service.title}
                    </h2>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClass(service.status)}`}
                  >
                    {service.status}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                  {service.description}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                  <div>
                    <strong>{service.price}</strong>
                    <span className="ml-2 text-sm text-slate-400">
                      {service.duration}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Preview service"
                      aria-label="Preview service"
                      onClick={() => setPreviewing(service)}
                    >
                      <Eye />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Edit service"
                      aria-label="Edit service"
                      onClick={() => openEdit(service)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title={
                        service.status === "Active"
                          ? "Pause service"
                          : "Publish service"
                      }
                      aria-label={
                        service.status === "Active"
                          ? "Pause service"
                          : "Publish service"
                      }
                      onClick={() => toggle(service.id)}
                    >
                      <Power />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-red-600 hover:text-red-700"
                      title="Delete service"
                      aria-label="Delete service"
                      onClick={() => remove(service.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mt-7 bg-white p-10 text-center shadow-none">
          <h2 className="font-semibold">No services yet</h2>
          <p className="mt-1 text-sm text-slate-500">
            Add your first service so customers know what you offer.
          </p>
          <Button
            type="button"
            onClick={openCreate}
            className="mt-4 bg-[#3c6355] text-white hover:bg-[#2f5044]"
          >
            Add service
          </Button>
        </Card>
      )}
      <ServiceFormSheet
        open={formOpen}
        service={editing}
        onClose={() => setFormOpen(false)}
        onSave={save}
      />
      <ServicePreviewSheet
        service={previewing}
        onClose={() => setPreviewing(null)}
      />
    </div>
  );
}
