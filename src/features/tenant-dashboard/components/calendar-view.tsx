"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarSelect } from "@/features/tenant-calendar/components/calendar-controls";
import { Agenda, MonthGrid, statusStyles, TimeGrid } from "@/features/tenant-calendar/components/calendar-views";
import { EventDialog } from "@/features/tenant-calendar/components/event-dialog";
import { calendarRange, conflictIds, dateLabel, manilaDate, moveAnchor } from "@/features/tenant-calendar/dates";
import { useCalendar } from "@/features/tenant-calendar/use-calendar";
import type { CalendarEvent, CalendarMode } from "@/features/tenant-calendar/types";

const modes: CalendarMode[] = ["month", "week", "day", "agenda"];

export function CalendarView({ businessId, businessName, initialDate }: { businessId: string; businessName: string; initialDate: string }) {
  const [anchor, setAnchor] = useState(initialDate);
  const [mode, setMode] = useState<CalendarMode>("month");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [dialog, setDialog] = useState<{ event: CalendarEvent | null; date: string } | null>(null);
  const [message, setMessage] = useState("");
  const range = useMemo(() => calendarRange(anchor, mode), [anchor, mode]);
  const { data, loading, error, live, refresh } = useCalendar(businessId, range.start, range.end);
  const visible = useMemo(() => (data?.events ?? []).filter((event) => (type === "all" || event.type === type) && (status === "all" || event.status === status)), [data, type, status]);
  const conflicts = useMemo(() => conflictIds(data?.events ?? []), [data]);
  const today = manilaDate();
  const title = mode === "month" ? dateLabel(anchor, { month: "long", year: "numeric" })
    : mode === "day" ? dateLabel(anchor, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : `${dateLabel(range.days[0])} – ${dateLabel(range.days[range.days.length - 1], { month: "short", day: "numeric", year: "numeric" })}`;
  const onSelect = (event: CalendarEvent) => setDialog({ event, date: manilaDate(event.startsAt) });
  const viewProps = { events: visible, conflicts, onSelect };

  return <div className="min-w-0 space-y-6 bg-white">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-3xl font-bold tracking-tight">Calendar</h1><p className="mt-1 text-sm text-slate-500">Appointments and internal schedules for {businessName}.</p>
        <p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><span className={`size-1.5 rounded-full ${live ? "bg-emerald-600" : "bg-amber-500"}`} />{live ? "Live updates" : "Checking for updates every 30 seconds"} · Asia/Manila (GMT+8)</p></div>
      <Button className="bg-[#3c6355] text-white hover:bg-[#315246]" onClick={() => { setMessage(""); setDialog({ event: null, date: anchor }); }}><Plus className="size-4" /> New event</Button>
    </header>

    <section aria-label="Calendar controls" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2"><Button variant="outline" onClick={() => setAnchor(manilaDate())}>Today</Button>
          <Button variant="ghost" size="icon" aria-label="Previous date range" onClick={() => setAnchor((date) => moveAnchor(date, mode, -1))}><ChevronLeft className="size-4" /></Button>
          <Button variant="ghost" size="icon" aria-label="Next date range" onClick={() => setAnchor((date) => moveAnchor(date, mode, 1))}><ChevronRight className="size-4" /></Button>
          <h2 className="text-lg font-semibold sm:text-xl">{title}</h2></div>
        <div className="flex rounded-lg border p-1" role="group" aria-label="Calendar view">{modes.map((item) => <Button key={item} size="sm" variant="ghost" aria-pressed={mode === item} onClick={() => setMode(item)} className={mode === item ? "bg-[#eaf3ee] text-[#3c6355]" : "text-slate-500"}>{item[0].toUpperCase() + item.slice(1)}</Button>)}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input aria-label="Jump to date" type="date" min="1900-01-01" max="2100-12-31" value={anchor} className="w-auto" onChange={(e) => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) setAnchor(e.target.value); }} />
        <CalendarSelect label="Filter event type" value={type} onChange={setType} options={[{ value: "all", label: "All event types" }, { value: "appointment", label: "Appointments" }, { value: "meeting", label: "Meetings" }, { value: "event", label: "Custom events" }]} />
        <CalendarSelect label="Filter event status" value={status} onChange={setStatus} options={[{ value: "all", label: "All statuses" }, ...Object.keys(statusStyles).map((value) => ({ value, label: value }))]} />
        <Button variant="ghost" size="icon" aria-label="Refresh calendar" onClick={refresh}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></Button>
        <span className="self-center text-xs text-slate-500 sm:ml-auto">{loading ? "Loading events…" : `${visible.length} event${visible.length === 1 ? "" : "s"} in this range`}</span>
      </div>
    </section>

    {message && <p role="status" className="rounded-lg border border-[#cdddd3] bg-[#f3f7f5] p-3 text-sm text-[#3c6355]">{message}</p>}
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{error}{data && " Displaying the last successfully loaded events."}</p><Button variant="outline" onClick={refresh}>Retry</Button>{error.includes("sign in") && <Link className="underline" href="/login?next=%2Ftenant-dashboard%2Fcalendar">Sign in</Link>}</div>}
    {data?.truncated && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This range has too many events to display completely. Switch to Week or Day to see a smaller range.</p>}
    {!!data?.unscheduled && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{data.unscheduled} appointment(s) have an invalid saved time and cannot be positioned. <Link className="underline" href="/tenant-dashboard/appointments">Review the appointment inbox.</Link></p>}
    {!!conflicts.size && <p className="flex items-center gap-2 text-sm text-amber-800"><AlertTriangle className="size-4 shrink-0" />{conflicts.size} events overlap in this range. Check staff availability.</p>}

    {loading ? <div role="status" aria-label="Loading calendar" className="h-96 animate-pulse rounded-xl border bg-slate-50" /> : data && <>
      {!visible.length && <div className="flex items-center gap-3 rounded-xl border border-dashed p-5 text-sm"><CalendarDays className="size-6 text-[#3c6355]" /><div><p className="font-semibold">No events for this range and filter</p><p className="mt-1 text-slate-500">Customer appointments appear automatically. Use New event for an internal meeting or schedule.</p></div></div>}
      {mode === "month" ? <MonthGrid {...viewProps} days={range.days} anchor={anchor} today={today} onDay={(day) => { setAnchor(day); setMode("day"); }} />
        : mode === "agenda" ? !!visible.length && <Agenda key={`${range.start}:${type}:${status}`} {...viewProps} />
          : <TimeGrid key={`${mode}:${range.start}`} {...viewProps} days={range.days} />}
      <div className="flex flex-wrap gap-3 text-xs text-slate-600" aria-label="Status legend">{Object.entries(statusStyles).map(([label, style]) => <span key={label} className="flex items-center gap-1.5"><span className={`size-3 rounded-full border ${style}`} />{label}</span>)}</div>
    </>}
    {dialog && <EventDialog key={dialog.event?.id ?? `new:${dialog.date}`} {...dialog} event={data?.events.find((event) => event.id === dialog.event?.id) ?? dialog.event} businessId={businessId} conflicting={dialog.event ? conflicts.has(dialog.event.id) : false} onClose={() => setDialog(null)} onSaved={(text) => { setMessage(text); setDialog(null); refresh(); }} />}
  </div>;
}
