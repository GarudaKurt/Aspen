"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  PawPrint,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import type { AppointmentRequest, AppointmentStatus } from "../types";

type BookingFilter = "all" | "upcoming" | "pending" | "completed" | "cancelled";

const filterOptions: Array<{ value: BookingFilter; label: string }> = [
  { value: "all", label: "All bookings" },
  { value: "upcoming", label: "Upcoming" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled or rejected" },
];

const statusMeta: Record<AppointmentStatus, { icon: LucideIcon; className: string }> = {
  Pending: { icon: Clock3, className: "bg-amber-50 text-amber-700" },
  Confirmed: { icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700" },
  Completed: { icon: Check, className: "bg-sky-50 text-sky-700" },
  Rejected: { icon: XCircle, className: "bg-red-50 text-red-700" },
  Cancelled: { icon: XCircle, className: "bg-slate-100 text-slate-600" },
};

function formatDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

function isUpcoming(appointment: AppointmentRequest) {
  if (appointment.status === "Cancelled" || appointment.status === "Rejected") return false;
  return new Date(`${appointment.appointmentDate}T23:59:59`).getTime() >= Date.now();
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { icon: Icon, className } = statusMeta[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      <Icon className="size-3.5" aria-hidden="true" />
      {status}
    </span>
  );
}

function BookingTimeline({ status }: { status: AppointmentStatus }) {
  if (status === "Rejected" || status === "Cancelled") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <XCircle className="size-4" />
        This request is no longer active.
      </div>
    );
  }

  const steps: AppointmentStatus[] = ["Pending", "Confirmed", "Completed"];
  const activeIndex = steps.indexOf(status);

  return (
    <ol className="flex items-center gap-2 text-[11px] text-slate-400 sm:gap-3">
      {steps.map((step, index) => {
        const complete = index <= activeIndex;
        return (
          <li key={step} className="flex min-w-0 flex-1 items-center gap-2">
            <span className={`grid size-6 shrink-0 place-items-center rounded-full ${complete ? "bg-[#3c6355] text-white" : "bg-slate-100 text-slate-400"}`}>
              {complete ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span className={`truncate ${complete ? "font-semibold text-[#3c6355]" : ""}`}>{step}</span>
            {index < steps.length - 1 && <span className={`h-px flex-1 ${index < activeIndex ? "bg-[#3c6355]" : "bg-slate-200"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

function BookingCard({ appointment, onOpen }: { appointment: AppointmentRequest; onOpen: () => void }) {
  return (
    <Card className="overflow-hidden border-[#e1e5e2] bg-white p-0 shadow-none transition-shadow hover:shadow-md">
      <button type="button" onClick={onOpen} className="block w-full p-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3c6355] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-[#c5714e]">
              {appointment.bookingReference || `Request ${appointment.appointmentId.slice(0, 8)}`}
            </p>
            <h2 className="mt-2 truncate text-lg font-semibold text-[#202321]">
              {appointment.businessName || "Pet service provider"}
            </h2>
            <p className="mt-1 truncate text-sm text-slate-500">{appointment.serviceName}</p>
          </div>
          <StatusBadge status={appointment.status} />
        </div>
        <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
          <span className="inline-flex min-w-0 items-center gap-2"><CalendarDays className="size-4 shrink-0 text-[#3c6355]" /> <span className="truncate">{formatDate(appointment.appointmentDate)}</span></span>
          <span className="inline-flex min-w-0 items-center gap-2"><Clock3 className="size-4 shrink-0 text-[#3c6355]" /> <span className="truncate">{appointment.appointmentTime}</span></span>
        </div>
        <div className="mt-5 border-t border-slate-100 pt-4"><BookingTimeline status={appointment.status} /></div>
        <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#3c6355]">View booking details <ChevronRight className="size-4" /></span>
      </button>
    </Card>
  );
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-[#f7faf8] p-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-[#3c6355]" />
      <div className="min-w-0"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-medium text-[#202321]">{value}</p></div>
    </div>
  );
}

export function CustomerBookingsPage({ initialAppointments, loadError }: { initialAppointments: AppointmentRequest[]; loadError?: string }) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [filter, setFilter] = useState<BookingFilter>("all");
  const [selected, setSelected] = useState<AppointmentRequest | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const visibleAppointments = useMemo(() => {
    return [...appointments]
      .sort((a, b) => `${a.appointmentDate} ${a.appointmentTime}`.localeCompare(`${b.appointmentDate} ${b.appointmentTime}`))
      .filter((appointment) => {
        if (filter === "all") return true;
        if (filter === "upcoming") return isUpcoming(appointment);
        if (filter === "pending") return appointment.status === "Pending";
        if (filter === "completed") return appointment.status === "Completed";
        return appointment.status === "Cancelled" || appointment.status === "Rejected";
      });
  }, [appointments, filter]);

  const counts = useMemo(() => ({
    all: appointments.length,
    upcoming: appointments.filter(isUpcoming).length,
    pending: appointments.filter(({ status }) => status === "Pending").length,
    completed: appointments.filter(({ status }) => status === "Completed").length,
  }), [appointments]);

  const cancelAppointment = async () => {
    if (!selected || cancelling || !["Pending", "Confirmed"].includes(selected.status)) return;
    setCancelling(true);
    try {
      const { data, error } = await getSupabaseBrowserClient().rpc("cancel_my_appointment", {
        p_appointment_id: selected.appointmentId,
      });
      if (error) throw error;
      const updated = { ...selected, status: "Cancelled" as const };
      setAppointments((current) => current.map((item) => item.appointmentId === selected.appointmentId ? updated : item));
      setSelected(updated);
      toast({ title: "Appointment cancelled", description: "The provider has been notified.", variant: "success" });
      void data;
    } catch {
      toast({ title: "Unable to cancel appointment", description: "Please try again or contact the provider.", variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fafcfb] text-[#171817]">
      <section className="mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-8 sm:py-12 lg:px-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c5714e]">Customer account</p>
            <h1 className="mt-2 text-3xl font-bold text-[#3c6355] sm:text-4xl">My bookings</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#777b78]">Keep track of your requests, confirmed visits, and completed pet care appointments in one place.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[330px]">
            {[
              [counts.upcoming, "Upcoming"],
              [counts.pending, "Awaiting reply"],
              [counts.completed, "Completed"],
            ].map(([value, label]) => <div key={label} className="rounded-xl border border-[#e1e5e2] bg-white px-3 py-3 text-center"><strong className="block text-xl text-[#3c6355]">{value}</strong><span className="mt-1 block text-[11px] text-slate-500">{label}</span></div>)}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-b border-[#e1e5e2] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => <Button key={option.value} type="button" variant="ghost" onClick={() => setFilter(option.value)} className={`rounded-full px-3 text-sm ${filter === option.value ? "bg-[#e8f5ef] text-[#3c6355]" : "text-slate-500 hover:bg-white"}`}>{option.label}</Button>)}
          </div>
          <Select value={filter} onValueChange={(value) => value && setFilter(value as BookingFilter)}>
            <SelectTrigger className="w-full bg-white sm:hidden"><SelectValue /></SelectTrigger>
            <SelectContent>{filterOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {loadError ? (
          <div role="alert" className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-6 py-12 text-center text-sm text-red-700"><AlertCircle className="mx-auto size-9" /><h2 className="mt-4 font-semibold">Unable to load bookings</h2><p className="mt-2">{loadError}</p></div>
        ) : visibleAppointments.length ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">{visibleAppointments.map((appointment) => <BookingCard key={appointment.appointmentId} appointment={appointment} onOpen={() => setSelected(appointment)} />)}</div>
        ) : appointments.length ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[#d8e0db] bg-white px-6 py-14 text-center"><AlertCircle className="mx-auto size-9 text-[#3c6355]" /><h2 className="mt-4 text-lg font-semibold">No bookings in this view</h2><p className="mt-2 text-sm text-slate-500">Try another filter to find a different appointment.</p></div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-[#d8e0db] bg-white px-6 py-16 text-center"><CalendarDays className="mx-auto size-10 text-[#3c6355]" /><h2 className="mt-4 text-xl font-semibold">No bookings yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">When you request an appointment, its reference number and status will appear here.</p><Link href="/#browse" className="mt-6 inline-flex h-9 items-center justify-center rounded-lg bg-[#3c6355] px-4 text-sm font-medium text-white transition hover:bg-[#2f5044]">Find a pet service</Link></div>
        )}
      </section>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent title="Booking details" onClose={() => setSelected(null)}>
          {selected && <div className="flex h-full flex-col"><div className="space-y-6 overflow-y-auto p-5 sm:p-6"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c5714e]">{selected.bookingReference || selected.appointmentId}</p><div className="mt-2 flex flex-wrap items-center gap-3"><h2 className="text-2xl font-bold">{selected.businessName || "Pet service provider"}</h2><StatusBadge status={selected.status} /></div><p className="mt-1 text-sm text-slate-500">{selected.serviceName}</p></div><BookingTimeline status={selected.status} /><div className="grid gap-3"><InfoRow icon={CalendarDays} label="Appointment" value={`${formatDate(selected.appointmentDate)} · ${selected.appointmentTime}`} /><InfoRow icon={PawPrint} label="Pet" value={`${selected.petName} · ${selected.petType}`} /><InfoRow icon={AlertCircle} label="Booking reference" value={selected.bookingReference || selected.appointmentId} /></div><div><h3 className="font-semibold">What happens next?</h3><p className="mt-2 text-sm leading-6 text-slate-600">{selected.status === "Pending" ? "Your request is waiting for the provider to confirm the schedule." : selected.status === "Confirmed" ? "Your appointment is confirmed. Keep this reference handy when you visit." : selected.status === "Completed" ? "This appointment is complete. Thank you for using Aspen." : selected.rejectionReason || "This appointment is no longer active."}</p></div>{selected.notes && <div><h3 className="font-semibold">Your notes</h3><p className="mt-2 rounded-xl border border-slate-200 p-4 text-sm leading-6 text-slate-600">{selected.notes}</p></div>}</div>{["Pending", "Confirmed"].includes(selected.status) && <div className="mt-auto border-t bg-white p-5"><Button type="button" variant="outline" onClick={() => void cancelAppointment()} disabled={cancelling} className="w-full border-red-200 text-red-700 hover:bg-red-50">{cancelling ? "Cancelling…" : "Cancel appointment"}</Button></div>}</div>}
        </SheetContent>
      </Sheet>
    </main>
  );
}
