"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Mail,
  MessageSquareText,
  PawPrint,
  Phone,
  Search,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import {
  appointmentStatusUpdateSchema,
} from "../schemas";
import { updateAppointmentStatus } from "../api/actions";
import { getTenantAppointments } from "../api/queries";
import type {
  AppointmentDateFilter,
  AppointmentRequest,
  AppointmentStatus,
  AppointmentStatusFilter,
} from "../types";

const statusOptions: AppointmentStatusFilter[] = [
  "All",
  "Pending",
  "Confirmed",
  "Completed",
  "Rejected",
  "Cancelled",
];

function statusClass(status: AppointmentStatus) {
  switch (status) {
    case "Pending":
      return "bg-amber-50 text-amber-700";
    case "Confirmed":
      return "bg-emerald-50 text-emerald-700";
    case "Completed":
      return "bg-sky-50 text-sky-700";
    case "Rejected":
      return "bg-red-50 text-red-700";
    case "Cancelled":
      return "bg-slate-100 text-slate-600";
  }
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass(status)}`}>
      {status}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof CalendarDays;
  tone: string;
}) {
  return (
    <Card className="bg-white p-5 shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <strong className="mt-2 block text-3xl">{value}</strong>
        </div>
        <span className={`grid size-11 place-items-center rounded-2xl ${tone}`}>
          <Icon className="size-5" />
        </span>
      </div>
    </Card>
  );
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function matchesDateFilter(
  date: string,
  filter: AppointmentDateFilter,
  now = new Date(),
) {
  if (filter === "all") return true;

  const appointmentDate = new Date(`${date}T12:00:00`);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  if (filter === "today") return appointmentDate.getTime() === today.getTime();
  if (filter === "upcoming") return appointmentDate >= today;

  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);
  return appointmentDate >= today && appointmentDate <= endOfWeek;
}

export function AppointmentManagementPage({
  initialAppointments,
  businessId,
}: {
  initialAppointments: AppointmentRequest[];
  businessId: string;
}) {
  const [appointments, setAppointments] = useState(() =>
    getTenantAppointments(initialAppointments, businessId),
  );
  const [selected, setSelected] = useState<AppointmentRequest | null>(null);
  const [pendingReject, setPendingReject] = useState<AppointmentRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatusFilter>("All");
  const [dateFilter, setDateFilter] = useState<AppointmentDateFilter>("all");

  const counts = useMemo(
    () => ({
      total: appointments.length,
      pending: appointments.filter(({ status }) => status === "Pending").length,
      confirmed: appointments.filter(({ status }) => status === "Confirmed").length,
      completed: appointments.filter(({ status }) => status === "Completed").length,
      rejectedCancelled: appointments.filter(
        ({ status }) => status === "Rejected" || status === "Cancelled",
      ).length,
    }),
    [appointments],
  );

  const visibleAppointments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return appointments.filter((appointment) => {
      const matchesStatus =
        statusFilter === "All" || appointment.status === statusFilter;
      const matchesSearch =
        !normalizedQuery ||
        appointment.customerName.toLowerCase().includes(normalizedQuery) ||
        appointment.serviceName.toLowerCase().includes(normalizedQuery);
      return (
        matchesStatus &&
        matchesSearch &&
        matchesDateFilter(appointment.appointmentDate, dateFilter)
      );
    });
  }, [appointments, dateFilter, query, statusFilter]);

  const updateStatus = (
    appointment: AppointmentRequest,
    status: AppointmentStatus,
    reason?: string,
  ) => {
    const parsed = appointmentStatusUpdateSchema.safeParse({
      status,
      rejectionReason: reason,
    });
    const result = updateAppointmentStatus(appointment, parsed.success ? parsed.data : {});
    if (!result.ok) {
      toast({ title: "Appointment update failed", description: result.error, variant: "destructive" });
      return false;
    }

    setAppointments((current) =>
      current.map((item) =>
        item.appointmentId === appointment.appointmentId ? result.appointment : item,
      ),
    );
    setSelected((current) =>
      current?.appointmentId === appointment.appointmentId ? result.appointment : current,
    );
    toast({
      title: status === "Confirmed" ? "Appointment confirmed" : "Appointment rejected",
      description: `${appointment.customerName}'s request was updated successfully.`,
      variant: "success",
    });
    return true;
  };

  const accept = (appointment: AppointmentRequest) => {
    if (appointment.status !== "Pending") return;
    updateStatus(appointment, "Confirmed");
  };

  const openReject = (appointment: AppointmentRequest) => {
    if (appointment.status !== "Pending") return;
    setRejectionReason("");
    setPendingReject(appointment);
  };

  const reject = () => {
    if (!pendingReject || pendingReject.status !== "Pending") return;
    if (updateStatus(pendingReject, "Rejected", rejectionReason.trim())) {
      setPendingReject(null);
      setRejectionReason("");
    }
  };

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3c6355]">
          Business calendar
        </p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Appointments</h1>
        <p className="mt-2 text-slate-500">
          Review customer requests and keep your schedule up to date.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Total requests" value={counts.total} icon={CalendarDays} tone="bg-emerald-50 text-[#3c6355]" />
        <SummaryCard label="Pending" value={counts.pending} icon={Clock3} tone="bg-amber-50 text-amber-700" />
        <SummaryCard label="Confirmed" value={counts.confirmed} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-700" />
        <SummaryCard label="Completed" value={counts.completed} icon={Check} tone="bg-sky-50 text-sky-700" />
        <SummaryCard label="Rejected / Cancelled" value={counts.rejectedCancelled} icon={XCircle} tone="bg-red-50 text-red-700" />
      </div>

      <Card className="overflow-hidden bg-white p-0 shadow-none">
        <div className="space-y-4 border-b border-slate-200 p-4 sm:p-5">
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => (
              <Button
                key={status}
                type="button"
                variant="ghost"
                onClick={() => setStatusFilter(status)}
                className={`rounded-full px-3 ${statusFilter === status ? "bg-[#e8f5ef] text-[#3c6355]" : "text-slate-500 hover:bg-slate-50"}`}
              >
                {status}
              </Button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <span className="sr-only">Search customer or service</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search customer or service"
                className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-[#3c6355] focus:ring-2 focus:ring-[#3c6355]/20"
              />
            </label>
            <label>
              <span className="sr-only">Filter by date</span>
              <select
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value as AppointmentDateFilter)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#3c6355]"
              >
                <option value="all">All dates</option>
                <option value="today">Today</option>
                <option value="upcoming">Upcoming</option>
                <option value="this-week">This week</option>
              </select>
            </label>
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {visibleAppointments.length ? (
            visibleAppointments.map((appointment) => (
              <article
                key={appointment.appointmentId}
                className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
              >
                <button
                  type="button"
                  onClick={() => setSelected(appointment)}
                  className="min-w-0 text-left"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold">{appointment.customerName}</h2>
                    <StatusBadge status={appointment.status} />
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="size-4 text-[#3c6355]" />
                      {formatDate(appointment.appointmentDate)} · {appointment.appointmentTime}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <PawPrint className="size-4 text-[#3c6355]" />
                      {appointment.serviceName} · {appointment.petName}
                    </span>
                  </div>
                  {appointment.notes && (
                    <p className="mt-3 line-clamp-1 text-sm text-slate-500">{appointment.notes}</p>
                  )}
                </button>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button type="button" variant="outline" onClick={() => setSelected(appointment)}>
                    View details
                  </Button>
                  {appointment.status === "Pending" && (
                    <>
                      <Button
                        type="button"
                        onClick={() => accept(appointment)}
                        className="bg-[#3c6355] text-white hover:bg-[#2f5044]"
                      >
                        <Check className="mr-2 size-4" />
                        Accept
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openReject(appointment)}
                        className="border-red-200 text-red-700 hover:bg-red-50"
                      >
                        <X className="mr-2 size-4" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="p-10 text-center">
              <CalendarDays className="mx-auto size-8 text-slate-300" />
              <h2 className="mt-3 font-semibold">No appointments found</h2>
              <p className="mt-1 text-sm text-slate-500">
                Try changing your search or filters.
              </p>
            </div>
          )}
        </div>
      </Card>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent title="Appointment details" onClose={() => setSelected(null)}>
          {selected && (
            <div className="flex h-full flex-col">
              <div className="space-y-5 overflow-y-auto p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">Request {selected.appointmentId}</p>
                    <h2 className="mt-1 text-2xl font-bold">{selected.customerName}</h2>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>
                <div className="grid gap-3 rounded-xl bg-[#f7faf8] p-4 text-sm">
                  <InfoRow icon={CalendarDays} label="Appointment" value={`${formatDate(selected.appointmentDate)} · ${selected.appointmentTime}`} />
                  <InfoRow icon={PawPrint} label="Service" value={selected.serviceName} />
                  <InfoRow icon={PawPrint} label="Pet" value={`${selected.petName} · ${selected.petType}`} />
                </div>
                <section>
                  <h3 className="font-semibold">Customer contact</h3>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <p className="flex items-center gap-2"><UserRound className="size-4 text-[#3c6355]" />{selected.customerName}</p>
                    <p className="flex items-center gap-2"><Mail className="size-4 text-[#3c6355]" />{selected.customerEmail}</p>
                    <p className="flex items-center gap-2"><Phone className="size-4 text-[#3c6355]" />{selected.customerPhone}</p>
                  </div>
                </section>
                <section>
                  <h3 className="font-semibold">Notes and special requests</h3>
                  <p className="mt-2 rounded-xl border border-slate-200 p-4 text-sm leading-6 text-slate-600">
                    {selected.notes || "No notes provided."}
                  </p>
                </section>
                {selected.rejectionReason && (
                  <section>
                    <h3 className="font-semibold">Rejection reason</h3>
                    <p className="mt-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">{selected.rejectionReason}</p>
                  </section>
                )}
              </div>
              {selected.status === "Pending" && (
                <div className="mt-auto flex gap-3 border-t bg-white p-5">
                  <Button type="button" onClick={() => accept(selected)} className="flex-1 bg-[#3c6355] text-white hover:bg-[#2f5044]">
                    <Check className="mr-2 size-4" />Accept
                  </Button>
                  <Button type="button" variant="outline" onClick={() => openReject(selected)} className="flex-1 border-red-200 text-red-700 hover:bg-red-50">
                    <X className="mr-2 size-4" />Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={Boolean(pendingReject)} onOpenChange={(open) => !open && setPendingReject(null)}>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject appointment?</AlertDialogTitle>
          <AlertDialogDescription>
            This will reject {pendingReject?.customerName}'s request. You can optionally include a reason.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="mt-4">
          <label htmlFor="rejection-reason" className="text-sm font-medium">Reason (optional)</label>
          <textarea
            id="rejection-reason"
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            placeholder="Tell the customer why this time is unavailable."
            className="mt-2 min-h-24 w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3c6355]/20"
            maxLength={500}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setPendingReject(null)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={reject}>Reject appointment</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-[#3c6355]" />
      <span className="text-slate-500">{label}</span>
      <strong className="ml-auto text-right">{value}</strong>
    </div>
  );
}
