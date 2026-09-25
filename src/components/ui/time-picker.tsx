"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? "00" : "30";
  return `${String(hour).padStart(2, "0")}:${minute}`;
});

export function TimePicker({
  value,
  onValueChange,
  disabled = false,
  "aria-label": ariaLabel,
}: {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger aria-label={ariaLabel} className="bg-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {timeOptions.map((time) => (
          <SelectItem key={time} value={time}>
            {formatTimeLabel(time)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function formatTimeLabel(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
}
