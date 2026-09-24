"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCalendarEvents } from "../mock-data";
import type { CalendarEvent } from "../types";
import { MobileDashboardNav } from "./dashboard-shell";

const filters: Array<CalendarEvent["type"] | "all"> = ["all", "booking", "meeting", "availability"];
const colors: Record<CalendarEvent["type"], string> = {
  booking: "bg-orange-500",
  meeting: "bg-violet-500",
  availability: "bg-emerald-500",
};

const formatMonth = (date: Date) =>
  new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMonthDays = (date: Date) => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const leadingDays = (firstDay.getDay() + 6) % 7;
  const totalDays = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return Array.from({ length: Math.ceil((leadingDays + totalDays) / 7) * 7 }, (_, index) => {
    const dayOffset = index - leadingDays;
    return new Date(date.getFullYear(), date.getMonth(), dayOffset + 1);
  });
};

export function CalendarView() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");

  const events = useMemo(() => getCalendarEvents(selectedMonth), [selectedMonth]);
  const visibleEvents = useMemo(
    () => filter === "all" ? events : events.filter((event) => event.type === filter),
    [events, filter],
  );
  const days = useMemo(() => getMonthDays(selectedMonth), [selectedMonth]);

  const moveMonth = (offset: number) => {
    setSelectedMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const eventByDate = new Map(visibleEvents.map((event) => [event.date, event]));

  return (
    <>
      <MobileDashboardNav />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="mt-1 text-slate-500">Your bookings and availability, all in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <Button
              key={item}
              variant={filter === item ? "default" : "outline"}
              onClick={() => setFilter(item)}
              className={filter === item ? "bg-[#3c6355] text-white" : ""}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="p-4 shadow-none">
          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" size="icon" onClick={() => moveMonth(-1)} aria-label="Previous month">
              <ChevronLeft />
            </Button>
            <h2 className="text-center text-2xl font-bold">{formatMonth(selectedMonth)}</h2>
            <Button variant="outline" size="icon" onClick={() => moveMonth(1)} aria-label="Next month">
              <ChevronRight />
            </Button>
          </div>

          <div className="mt-5 grid grid-cols-7 border-l border-t">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="border-b border-r bg-slate-50 p-2 text-xs font-medium text-slate-500">
                {day}
              </div>
            ))}
            {days.map((day) => {
              const dateKey = toDateKey(day);
              const event = eventByDate.get(dateKey);
              const isCurrentMonth = day.getMonth() === selectedMonth.getMonth();

              return (
                <div
                  key={dateKey}
                  className={`min-h-24 border-b border-r p-2 text-sm ${isCurrentMonth ? "bg-white" : "bg-slate-50/60 text-slate-300"}`}
                >
                  <span className="font-semibold">{day.getDate()}</span>
                  {event && (
                    <span className={`mt-8 block truncate rounded px-1 py-1 text-[10px] text-white ${colors[event.type]}`}>
                      {event.time} {event.type}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5 shadow-none">
          <h2 className="text-xl font-semibold">Upcoming</h2>
          {visibleEvents.length ? (
            visibleEvents.map((event) => (
              <div key={event.id} className="border-b py-4 last:border-0">
                <strong className="block">{event.time} · {event.title}</strong>
                <span className="text-sm text-slate-500">{event.customer} · {event.date}</span>
              </div>
            ))
          ) : (
            <p className="py-8 text-sm text-slate-500">No events match this filter.</p>
          )}
        </Card>
      </div>
    </>
  );
}
