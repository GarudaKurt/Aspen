export type BusinessHoursDay = {
  day: string;
  open: boolean;
  openTime: string;
  closeTime: string;
};

export const businessDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const initialBusinessHours: BusinessHoursDay[] = [
  ...["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => ({
    day,
    open: true,
    openTime: "08:00",
    closeTime: "20:00",
  })),
  { day: "Saturday", open: true, openTime: "09:00", closeTime: "18:00" },
  { day: "Sunday", open: true, openTime: "08:00", closeTime: "12:00" },
];

export function formatBusinessTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function getBusinessHoursStatus(
  schedule: BusinessHoursDay[],
  now = new Date(),
) {
  const today = schedule.find(
    ({ day }) =>
      day.toLowerCase() ===
      now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase(),
  );

  if (!today?.open) return { label: "Closed", open: false };
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMinute] = today.openTime.split(":").map(Number);
  const [closeHour, closeMinute] = today.closeTime.split(":").map(Number);
  const isOpen =
    currentMinutes >= openHour * 60 + openMinute &&
    currentMinutes < closeHour * 60 + closeMinute;

  return { label: isOpen ? "Open" : "Closed", open: isOpen };
}

export function isValidBusinessHours(day: BusinessHoursDay) {
  if (!day.open) return true;
  const [openHour, openMinute] = day.openTime.split(":").map(Number);
  const [closeHour, closeMinute] = day.closeTime.split(":").map(Number);
  return (
    [openHour, openMinute, closeHour, closeMinute].every(Number.isFinite) &&
    openHour * 60 + openMinute < closeHour * 60 + closeMinute
  );
}

export type BusinessHoursDisplayRow = {
  label: string;
  value: string;
};

function sameHours(left: BusinessHoursDay, right: BusinessHoursDay) {
  return (
    left.open === right.open &&
    left.openTime === right.openTime &&
    left.closeTime === right.closeTime
  );
}

function formatHoursValue(entry: BusinessHoursDay) {
  return entry.open
    ? `${formatBusinessTime(entry.openTime)} – ${formatBusinessTime(entry.closeTime)}`
    : "Closed";
}

export function getBusinessHoursDisplayRows(
  schedule: BusinessHoursDay[],
): BusinessHoursDisplayRow[] {
  const byDay = new Map(schedule.map((entry) => [entry.day, entry]));
  const weekdayEntries = businessDays
    .slice(0, 5)
    .map((day) => byDay.get(day))
    .filter(Boolean) as BusinessHoursDay[];
  const weekendEntries = businessDays
    .slice(5)
    .map((day) => byDay.get(day))
    .filter(Boolean) as BusinessHoursDay[];
  const rows: BusinessHoursDisplayRow[] = [];

  if (
    weekdayEntries.length === 5 &&
    weekdayEntries.every((entry) => sameHours(entry, weekdayEntries[0]))
  ) {
    rows.push({
      label: "Mon – Fri",
      value: formatHoursValue(weekdayEntries[0]),
    });
  } else {
    rows.push(
      ...weekdayEntries.map((entry) => ({
        label: entry.day,
        value: formatHoursValue(entry),
      })),
    );
  }

  if (
    weekendEntries.length === 2 &&
    weekendEntries.every((entry) => sameHours(entry, weekendEntries[0]))
  ) {
    rows.push({
      label: "Sat – Sun",
      value: formatHoursValue(weekendEntries[0]),
    });
  } else {
    rows.push(
      ...weekendEntries.map((entry) => ({
        label: entry.day,
        value: formatHoursValue(entry),
      })),
    );
  }

  return rows;
}
