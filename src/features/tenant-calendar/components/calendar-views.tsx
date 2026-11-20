"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addDays, dateLabel, eventsOnDate, manilaDate, timeLabel, toInstant } from "../dates";
import type { CalendarEvent } from "../types";

export const statusStyles: Record<CalendarEvent["status"], string> = {
  Pending: "border-amber-200 bg-amber-50 text-amber-900",
  Confirmed: "border-emerald-200 bg-emerald-50 text-emerald-900",
  Completed: "border-sky-200 bg-sky-50 text-sky-900",
  Cancelled: "border-slate-200 bg-slate-100 text-slate-600",
  Rejected: "border-rose-200 bg-rose-50 text-rose-900",
};

function EventButton({ event, onSelect, conflict, compact = false }: { event: CalendarEvent; onSelect: (event: CalendarEvent) => void; conflict: boolean; compact?: boolean }) {
  return <button type="button" onClick={() => onSelect(event)} title={`${timeLabel(event.startsAt)} · ${event.title} · ${event.status}`}
    className={`w-full min-w-0 rounded-md border px-2 py-1.5 text-left text-xs transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-[#3c6355] ${statusStyles[event.status]}`}>
    <span className="flex items-center gap-1"><span className="truncate font-semibold">{timeLabel(event.startsAt)} · {event.title}</span>{conflict && <AlertTriangle aria-label="Schedule overlap" className="size-3 shrink-0" />}</span>
    {!compact && <span className="mt-0.5 block truncate opacity-80">{event.type === "appointment" ? event.customer : event.type} · {event.status}</span>}
  </button>;
}

type ViewProps = { events: CalendarEvent[]; conflicts: Set<string>; onSelect: (event: CalendarEvent) => void };

export function MonthGrid({ days, anchor, today, onDay, ...props }: ViewProps & { days: string[]; anchor: string; today: string; onDay: (date: string) => void }) {
  return <div className="overflow-hidden rounded-xl border bg-white">
    <div className="grid grid-cols-7 border-b">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} className="py-3 text-center text-xs font-medium text-slate-500">{day}</div>)}</div>
    <div className="grid grid-cols-7">{days.map((day) => {
      const events = eventsOnDate(props.events, day);
      return <div key={day} className={`min-h-24 min-w-0 border-r border-b p-1 last:border-r-0 sm:min-h-36 sm:p-2 ${day.slice(0, 7) !== anchor.slice(0, 7) ? "bg-slate-50/60" : ""}`}>
        <button type="button" onClick={() => onDay(day)} aria-label={`View ${dateLabel(day, { dateStyle: "full" })}, ${events.length} events`} aria-current={day === today ? "date" : undefined}
          className={`mb-1 grid size-8 place-items-center rounded-full text-sm hover:ring-2 hover:ring-[#3c6355]/30 focus-visible:outline-2 focus-visible:outline-[#3c6355] ${day === today ? "bg-[#3c6355] font-semibold text-white" : "text-slate-700"}`}>{Number(day.slice(-2))}</button>
        <div className="hidden space-y-1 sm:block">{events.slice(0, 3).map((event) => <EventButton key={event.id} event={event} compact onSelect={props.onSelect} conflict={props.conflicts.has(event.id)} />)}{events.length > 3 && <button className="rounded px-1 text-xs font-semibold text-[#3c6355] hover:underline" onClick={() => onDay(day)}>+{events.length - 3} more</button>}</div>
        <button type="button" onClick={() => onDay(day)} className="w-full rounded py-1 text-left text-[10px] text-slate-600 sm:hidden" aria-label={`${events.length} events on ${day}`}>
          <span className="flex flex-wrap gap-1">{events.slice(0, 4).map((e) => <span key={e.id} className={`size-2 rounded-full border ${statusStyles[e.status]}`} />)}</span>{events.length > 0 && <span className="mt-1 block">{events.length} event{events.length === 1 ? "" : "s"}</span>}
        </button>
      </div>;
    })}</div>
  </div>;
}

function layoutDay(events: CalendarEvent[], date: string) {
  const start = Date.parse(toInstant(`${date}T00:00`));
  const end = Date.parse(toInstant(`${addDays(date, 1)}T00:00`));
  const positioned: { event: CalendarEvent; start: number; end: number; lane: number; lanes: number }[] = [];
  let group: typeof positioned = [];
  let laneEnds: number[] = [];
  let groupEnd = 0;
  const flush = () => { group.forEach((item) => { item.lanes = laneEnds.length; positioned.push(item); }); group = []; laneEnds = []; };
  for (const event of eventsOnDate(events, date).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))) {
    const from = Math.max(start, Date.parse(event.startsAt));
    const to = Math.min(end, Date.parse(event.endsAt));
    if (from >= groupEnd) flush();
    let lane = laneEnds.findIndex((value) => value <= from);
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = to;
    groupEnd = Math.max(groupEnd, to);
    group.push({ event, start: (from - start) / 60_000, end: (to - start) / 60_000, lane, lanes: 1 });
  }
  flush();
  return positioned;
}

export function TimeGrid({ days, ...props }: ViewProps & { days: string[] }) {
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scroll.current) scroll.current.scrollTop = 7 * 48; }, []);
  return <>
    {days.length > 1 && <div className="space-y-3 md:hidden">{days.map((day) => <section key={day} className="rounded-xl border p-4"><h3 className="mb-3 font-semibold">{dateLabel(day, { weekday: "short", month: "short", day: "numeric" })}</h3><div className="space-y-2">{eventsOnDate(props.events, day).map((event) => <EventButton key={event.id} event={event} onSelect={props.onSelect} conflict={props.conflicts.has(event.id)} />)}{!eventsOnDate(props.events, day).length && <p className="text-sm text-slate-500">No events</p>}</div></section>)}</div>}
    <div className={`overflow-hidden rounded-xl border ${days.length > 1 ? "hidden md:block" : ""}`}>
      <div className="grid border-b bg-white" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}><span className="p-2 text-[10px] text-slate-500">GMT+8</span>{days.map((day) => <div key={day} className="border-l p-3 text-center text-sm font-medium">{dateLabel(day, { weekday: "short", day: "numeric" })}</div>)}</div>
      <div ref={scroll} className="max-h-[600px] overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}>
          <div className="relative h-[1152px]">{Array.from({ length: 24 }, (_, hour) => <span key={hour} style={{ top: hour * 48 }} className="absolute right-2 text-[10px] text-slate-500">{String(hour).padStart(2, "0")}:00</span>)}</div>
          {days.map((day) => <div key={day} className="relative h-[1152px] border-l">
            {Array.from({ length: 24 }, (_, hour) => <div key={hour} className="h-12 border-t border-slate-100" />)}
            {layoutDay(props.events, day).map(({ event, start, end, lane, lanes }) => <button key={event.id} type="button" onClick={() => props.onSelect(event)}
              aria-label={`${event.title}, ${timeLabel(event.startsAt)} to ${timeLabel(event.endsAt)}, ${event.status}${props.conflicts.has(event.id) ? ", overlapping schedule" : ""}`}
              title={`${event.title} · ${timeLabel(event.startsAt)} – ${timeLabel(event.endsAt)} · ${event.status}`}
              style={{ top: start * .8, height: Math.max((end - start) * .8 - 2, 16), left: `${lane * 100 / lanes}%`, width: `${100 / lanes}%` }}
              className={`absolute overflow-hidden rounded-md border px-1.5 py-1 text-left text-xs transition hover:z-10 hover:brightness-95 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-[#3c6355] ${statusStyles[event.status]}`}>
              <span className="block truncate font-semibold">{props.conflicts.has(event.id) && "⚠ "}{event.title}</span><span className="block truncate">{timeLabel(event.startsAt)} · {event.status}</span>
            </button>)}
          </div>)}
        </div>
      </div>
    </div>
  </>;
}

export function Agenda({ events, ...props }: ViewProps) {
  const [page, setPage] = useState(0);
  const maxPage = Math.max(0, Math.ceil(events.length / 50) - 1);
  const current = Math.min(page, maxPage);
  return <div className="overflow-hidden rounded-xl border">
    <ul className="divide-y">{events.slice(current * 50, (current + 1) * 50).map((event) => <li key={event.id}>
      <button type="button" onClick={() => props.onSelect(event)} className="flex w-full flex-wrap items-center gap-3 p-4 text-left transition hover:bg-[#f3f7f5] focus-visible:outline-2 focus-visible:outline-[#3c6355] sm:flex-nowrap sm:gap-5">
        <span className="w-20 shrink-0 text-sm font-semibold text-[#3c6355]">{dateLabel(manilaDate(event.startsAt))}</span>
        <span className="min-w-0 flex-1"><span className="block break-words font-medium">{event.title}</span><span className="mt-1 block text-sm text-slate-500">{timeLabel(event.startsAt)} – {timeLabel(event.endsAt)} · {event.customer || (event.type === "meeting" ? "Meeting" : "Custom event")}</span></span>
        {props.conflicts.has(event.id) && <AlertTriangle aria-label="Schedule overlap" className="size-4 shrink-0 text-amber-700" />}
        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[event.status]}`}>{event.status}</span>
      </button>
    </li>)}</ul>
    {maxPage > 0 && <div className="flex items-center justify-between border-t p-3"><Button variant="outline" disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</Button><p className="text-xs text-slate-500">Page {current + 1} of {maxPage + 1}</p><Button variant="outline" disabled={current >= maxPage} onClick={() => setPage(current + 1)}>Next</Button></div>}
  </div>;
}
