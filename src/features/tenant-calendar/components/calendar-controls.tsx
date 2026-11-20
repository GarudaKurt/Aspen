"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CalendarSelect({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void;
}) {
  return <Select value={value} onValueChange={(next) => { if (next) onChange(next); }} items={options}>
    <SelectTrigger aria-label={label} className="w-full min-w-36 bg-white sm:w-auto"><SelectValue /></SelectTrigger>
    <SelectContent positionerClassName="z-[80]">{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
  </Select>;
}
