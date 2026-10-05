"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarCheck,
  Eye,
  Heart,
  MessageCircle,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ServiceFormSheet } from "./service-form-sheet";
import { ServicePreviewSheet } from "./service-preview-sheet";
import type { ServiceAnalytics, ServiceItem } from "../types";

type ServiceDraft = Omit<ServiceItem, "id">;
type StatusFilter = "All" | ServiceItem["status"];
const emptyAnalytics: ServiceAnalytics = { views: 0, favorites: 0, inquiries: 0, bookings: 0 };

function statusClass(status: ServiceItem["status"]) {
  return status === "Active"
    ? "bg-emerald-50 text-emerald-700"
    : status === "Draft"
      ? "bg-sky-50 text-sky-700"
      : "bg-orange-50 text-orange-700";
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="size-4 shrink-0 text-[#3c6355]" aria-hidden="true" />
      <div className="min-w-0">
        <strong className="block text-sm leading-5">{value}</strong>
        <span className="block truncate text-[10px] uppercase tracking-wide text-slate-500">
          {label}
        </span>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <Card className="bg-white p-5 shadow-none">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <strong className="mt-2 block text-3xl">{value}</strong>
        </div>
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-[#3c6355]">
          <Icon className="size-6" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-6 text-sm text-slate-500">{detail}</p>
    </Card>
  );
}

export function ServicesView({
  initialServices,
  initialAnalytics = {},
}: {
  initialServices: ServiceItem[];
  initialAnalytics?: Record<string, ServiceAnalytics>;
}) {
  const [items, setItems] = useState(initialServices);
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [previewing, setPreviewing] = useState<ServiceItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ServiceItem | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("All");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      All: items.length,
      Active: items.filter((service) => service.status === "Active").length,
      Draft: items.filter((service) => service.status === "Draft").length,
      Paused: items.filter((service) => service.status === "Paused").length,
    }),
    [items],
  );

  const totals = useMemo(
    () =>
      items.reduce(
        (result, service) => {
          const metrics = analytics[service.id] ?? emptyAnalytics;
          return {
            views: result.views + metrics.views,
            favorites: result.favorites + metrics.favorites,
            inquiries: result.inquiries + metrics.inquiries,
            bookings: result.bookings + metrics.bookings,
          };
        },
        { ...emptyAnalytics },
      ),
    [analytics, items],
  );

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((service) => {
      const matchesFilter = filter === "All" || service.status === filter;
      const matchesQuery =
        !normalizedQuery ||
        [service.title, service.category, service.description].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        );
      return matchesFilter && matchesQuery;
    });
  }, [filter, items, query]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (service: ServiceItem) => {
    setEditing(service);
    setFormOpen(true);
  };

  const save = (draft: ServiceDraft) => {
    if (editing) {
      setItems((current) =>
        current.map((service) =>
          service.id === editing.id ? { ...draft, id: editing.id } : service,
        ),
      );
    } else {
      const id = crypto.randomUUID();
      setItems((current) => [...current, { ...draft, id }]);
      setAnalytics((current) => ({ ...current, [id]: emptyAnalytics }));
    }
    setFormOpen(false);
  };

  const remove = () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setItems((current) => current.filter((service) => service.id !== id));
    setAnalytics((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setPendingDelete(null);
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
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3c6355]">
            Service management
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Your listings</h1>
          <p className="mt-2 text-slate-500">
            Create and manage services owned only by this provider account.
          </p>
        </div>
        <Button
          type="button"
          onClick={openCreate}
          className="bg-[#3c6355] text-white hover:bg-[#2f5044]"
        >
          <Plus className="mr-2 size-4" />
          Add new listing
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={BarChart3} label="Total listings" value={counts.All} detail={`${counts.Active} currently active`} />
        <SummaryCard icon={Eye} label="Total views" value={totals.views} detail="Across your listings" />
        <SummaryCard icon={MessageCircle} label="Inquiries" value={totals.inquiries} detail="Account-owned inquiries" />
        <SummaryCard icon={CalendarCheck} label="Bookings" value={totals.bookings} detail="Across your listings" />
      </div>

      <Card className="overflow-hidden bg-white p-0 shadow-none">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2 rounded-xl bg-[#f6f3f9] p-1">
            {(["All", "Active", "Draft", "Paused"] as StatusFilter[]).map((item) => (
              <Button
                key={item}
                type="button"
                variant="ghost"
                onClick={() => setFilter(item)}
                className={`h-9 rounded-lg px-3 text-sm ${filter === item ? "bg-white text-[#3c6355] shadow-sm" : "text-slate-500 hover:bg-white/70"}`}
              >
                {item}
                <span className="ml-1 text-xs">{counts[item]}</span>
              </Button>
            ))}
          </div>
          <label className="relative block w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <span className="sr-only">Search listings</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search listings"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-[#3c6355] focus:ring-2 focus:ring-[#3c6355]/20"
            />
          </label>
        </div>

        <div className="divide-y divide-slate-200">
          {visibleItems.length ? (
            visibleItems.map((service) => {
              const metrics = analytics[service.id] ?? emptyAnalytics;
              return (
                <article key={service.id} className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(250px,.8fr)_auto] lg:items-center">
                  <div className="flex min-w-0 gap-4">
                    <div className="size-28 shrink-0 overflow-hidden rounded-xl bg-[#eef5f1]">
                      {service.photos?.[0] ? (
                        <img src={service.photos[0]} alt="" className="size-full object-cover" />
                      ) : (
                        <div className="grid size-full place-items-center text-3xl font-bold text-[#3c6355]">
                          {service.title.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(service.status)}`}>
                        {service.status}
                      </span>
                      <p className="mt-2 text-sm text-[#3c6355]">{service.category}</p>
                      <h2 className="truncate text-xl font-bold">{service.title}</h2>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{service.description}</p>
                      <p className="mt-3 font-bold text-[#3c6355]">{service.price}<span className="ml-2 text-sm font-normal text-slate-400">{service.duration}</span></p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-5 gap-y-4 rounded-xl bg-emerald-50/60 p-4 sm:grid-cols-4 lg:grid-cols-2">
                    <Metric icon={Eye} label="Views" value={metrics.views} />
                    <Metric icon={Heart} label="Favorites" value={metrics.favorites} />
                    <Metric icon={MessageCircle} label="Inquiries" value={metrics.inquiries} />
                    <Metric icon={CalendarCheck} label="Bookings" value={metrics.bookings} />
                  </div>

                  <div className="flex flex-wrap gap-2 lg:flex-col">
                    <Button type="button" variant="outline" onClick={() => setPreviewing(service)} className="flex-1 lg:flex-none">
                      <Eye className="mr-2 size-4" />Preview
                    </Button>
                    <Button type="button" onClick={() => openEdit(service)} className="flex-1 bg-[#3c6355] text-white hover:bg-[#2f5044] lg:flex-none">
                      <Pencil className="mr-2 size-4" />Edit
                    </Button>
                    <Button type="button" variant="outline" onClick={() => toggle(service.id)} className="flex-1 lg:flex-none">
                      <Power className="mr-2 size-4" />{service.status === "Active" ? "Pause" : "Publish"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setPendingDelete(service)} className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700 lg:flex-none">
                      <Trash2 className="mr-2 size-4" />Delete
                    </Button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="p-10 text-center">
              <h2 className="font-semibold">{items.length ? "No matching listings" : "No services yet"}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {items.length ? "Try another search or filter." : "Add your first service so customers know what you offer."}
              </p>
              {!items.length && (
                <Button type="button" onClick={openCreate} className="mt-4 bg-[#3c6355] text-white hover:bg-[#2f5044]">
                  Add service
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      <ServiceFormSheet open={formOpen} service={editing} onClose={() => setFormOpen(false)} onSave={save} />
      <ServicePreviewSheet service={previewing} onClose={() => setPreviewing(null)} />

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete service?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove <strong>{pendingDelete?.title}</strong> from your listings. Customers will no longer see it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setPendingDelete(null)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={remove}>Delete service</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </div>
  );
}
