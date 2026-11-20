import type { CalendarEvent, CalendarMode } from "./types";

export const CALENDAR_TIME_ZONE = "Asia/Manila";
const DAY = 86_400_000;

export function manilaDate(value: string | Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CALENDAR_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

// Civil dates use UTC arithmetic, so the browser's local zone and DST cannot shift them.
export function addDays(date: string, days: number) {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * DAY).toISOString().slice(0, 10);
}

export function dateLabel(date: string, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  return new Intl.DateTimeFormat("en-PH", { ...options, timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export function timeLabel(instant: string) {
  return new Intl.DateTimeFormat("en-PH", { timeZone: CALENDAR_TIME_ZONE, hour: "numeric", minute: "2-digit" }).format(new Date(instant));
}

export function toLocalInput(instant: string) {
  const date = new Date(new Date(instant).getTime() + 8 * 3_600_000);
  return date.toISOString().slice(0, 16);
}

export function toInstant(local: string) {
  return new Date(`${local}:00+08:00`).toISOString();
}

export function calendarRange(anchor: string, mode: CalendarMode) {
  const date = new Date(`${anchor}T00:00:00Z`);
  let start = anchor;
  let days = 1;
  if (mode === "month") {
    const first = `${anchor.slice(0, 7)}-01`;
    start = addDays(first, -((new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7));
    days = 42;
  } else if (mode === "week") {
    start = addDays(anchor, -((date.getUTCDay() + 6) % 7));
    days = 7;
  } else if (mode === "agenda") days = 30;
  return { start: toInstant(`${start}T00:00`), end: toInstant(`${addDays(start, days)}T00:00`), days: Array.from({ length: days }, (_, i) => addDays(start, i)) };
}

export function moveAnchor(anchor: string, mode: CalendarMode, direction: number) {
  if (mode !== "month") return addDays(anchor, direction * (mode === "week" ? 7 : mode === "agenda" ? 30 : 1));
  const date = new Date(`${anchor.slice(0, 7)}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + direction);
  return date.toISOString().slice(0, 10);
}

export function overlaps(a: Pick<CalendarEvent, "startsAt" | "endsAt">, b: Pick<CalendarEvent, "startsAt" | "endsAt">) {
  return Date.parse(a.startsAt) < Date.parse(b.endsAt) && Date.parse(b.startsAt) < Date.parse(a.endsAt);
}

export function eventsOnDate(events: CalendarEvent[], date: string) {
  const day = { startsAt: toInstant(`${date}T00:00`), endsAt: toInstant(`${addDays(date, 1)}T00:00`) };
  return events.filter((event) => overlaps(event, day));
}

export function conflictIds(events: CalendarEvent[]) {
  const conflicts = new Set<string>();
  const active = events.filter((e) => e.status === "Pending" || e.status === "Confirmed")
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  // Only the furthest-ending prior interval is needed to mark every overlapping event.
  let previous: CalendarEvent | undefined;
  for (const event of active) {
    if (previous && overlaps(previous, event)) { conflicts.add(previous.id); conflicts.add(event.id); }
    if (!previous || Date.parse(event.endsAt) > Date.parse(previous.endsAt)) previous = event;
  }
  return conflicts;
}
