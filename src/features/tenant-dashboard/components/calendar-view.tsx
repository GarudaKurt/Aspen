"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { calendarEvents } from "../mock-data";
import type { CalendarEvent } from "../types";
import { MobileDashboardNav } from "./dashboard-shell";

const filters: Array<CalendarEvent["type"] | "all"> = ["all", "booking", "meeting", "availability"];
const colors: Record<CalendarEvent["type"], string> = { booking: "bg-orange-500", meeting: "bg-violet-500", availability: "bg-emerald-500" };

export function CalendarView() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const visible = useMemo(() => filter === "all" ? calendarEvents : calendarEvents.filter((event) => event.type === filter), [filter]);
  const days = Array.from({ length: 35 }, (_, index) => index - 1);
  return <><MobileDashboardNav /><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold">Calendar</h1><p className="mt-1 text-slate-500">Your bookings and availability, all in one place.</p></div><div className="flex flex-wrap gap-2">{filters.map((item)=><Button key={item} variant={filter===item?"default":"outline"} onClick={()=>setFilter(item)} className={filter===item?"bg-[#3c6355] text-white":""}>{item[0].toUpperCase()+item.slice(1)}</Button>)}</div></div><div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"><Card className="p-4 shadow-none"><div className="flex items-center justify-between"><Button variant="outline" size="icon"><ChevronLeft /></Button><h2 className="text-2xl font-bold">September 2026</h2><Button variant="outline" size="icon"><ChevronRight /></Button></div><div className="mt-5 grid grid-cols-7 border-l border-t">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day)=><div key={day} className="border-b border-r bg-slate-50 p-2 text-xs font-medium text-slate-500">{day}</div>)}{days.map((day, index)=>{const event=visible.find((item)=>Number(item.date.slice(-2))===day); return <div key={index} className="min-h-24 border-b border-r p-2 text-sm">{day > 0 && day <= 30 ? <><span className="font-semibold">{day}</span>{event && <span className={`mt-8 block truncate rounded px-1 py-1 text-[10px] text-white ${colors[event.type]}`}>{event.time} {event.type}</span>}</> : null}</div>})}</div></Card><Card className="p-5 shadow-none"><h2 className="text-xl font-semibold">Upcoming</h2>{visible.length ? visible.map((event)=><div key={event.id} className="border-b py-4 last:border-0"><strong className="block">{event.time} · {event.title}</strong><span className="text-sm text-slate-500">{event.customer} · {event.date}</span></div>) : <p className="py-8 text-sm text-slate-500">No events match this filter.</p>}</Card></div></>;
}
