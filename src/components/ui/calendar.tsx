"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type CalendarProps = {
  selected?: Date;
  onSelect: (date: Date) => void;
  disabled?: (date: Date) => boolean;
};

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function sameDay(first?: Date, second?: Date) {
  return Boolean(first && second && first.toDateString() === second.toDateString());
}

export function Calendar({ selected, onSelect, disabled }: CalendarProps) {
  const [viewDate, setViewDate] = React.useState(selected ?? new Date());
  React.useEffect(() => { if (selected) setViewDate(selected); }, [selected]);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, index) => index < firstDay ? null : new Date(year, month, index - firstDay + 1));

  return <div className="w-full max-w-sm rounded-xl border border-[#d7d8d5] bg-white p-4">
    <div className="mb-4 flex items-center justify-between"><Button type="button" variant="ghost" size="icon-sm" onClick={() => setViewDate(new Date(year, month - 1, 1))} aria-label="Previous month"><ChevronLeft /></Button><p className="text-sm font-semibold">{monthNames[month]} {year}</p><Button type="button" variant="ghost" size="icon-sm" onClick={() => setViewDate(new Date(year, month + 1, 1))} aria-label="Next month"><ChevronRight /></Button></div>
    <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">{weekDays.map((day) => <span key={day} className="py-1 font-medium">{day}</span>)}</div>
    <div className="mt-1 grid grid-cols-7 gap-1">{cells.map((date, index) => { const isDisabled = !date || Boolean(disabled?.(date)); const isSelected = sameDay(date ?? undefined, selected); return <Button key={date ? date.toISOString() : `empty-${index}`} type="button" variant="ghost" disabled={isDisabled} onClick={() => date && onSelect(date)} aria-label={date ? date.toDateString() : undefined} aria-pressed={isSelected} className={`h-9 w-full rounded-md p-0 text-sm ${isSelected ? "bg-[#3c6355] text-white hover:bg-[#2f5044] hover:text-white" : ""} ${isDisabled ? "text-slate-300" : "hover:bg-[#e8f5ef]"}`}>{date?.getDate() ?? ""}</Button>; })}</div>
  </div>;
}

import * as React from "react";
