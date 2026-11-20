import { z } from "zod";
import { appointmentStatusSchema } from "@/features/appointments/schemas";

const instant = z.string().datetime({ offset: true }).refine((value) => Number.isFinite(Date.parse(value)), "Invalid date or time.");
export const calendarRangeSchema = z.object({
  businessId: z.string().uuid(),
  start: instant,
  end: instant,
  type: z.enum(["all", "appointment", "meeting", "event"]).default("all"),
  status: z.union([z.literal("all"), appointmentStatusSchema]).default("all"),
}).refine((v) => Date.parse(v.end) > Date.parse(v.start) && Date.parse(v.end) - Date.parse(v.start) <= 43 * 86_400_000,
  "Choose a date range of at most 43 days.");

export const calendarEventSchema = z.object({
  businessId: z.string().uuid(),
  id: z.string().uuid().optional(),
  updatedAt: instant.optional(),
  title: z.string().trim().min(1, "Enter an event title.").max(160),
  description: z.string().trim().max(4000),
  location: z.string().trim().max(240),
  type: z.enum(["meeting", "event"]),
  status: z.enum(["Confirmed", "Completed", "Cancelled"]),
  startsAt: instant,
  endsAt: instant,
}).refine((v) => !v.id || Boolean(v.updatedAt), "Reload this event before editing.")
  .refine((v) => Date.parse(v.endsAt) > Date.parse(v.startsAt) && Date.parse(v.endsAt) - Date.parse(v.startsAt) <= 7 * 86_400_000,
    "End time must follow start time, within seven days.");
export const calendarDeleteSchema = z.object({ businessId: z.string().uuid(), id: z.string().uuid(), updatedAt: instant });
export type CalendarEventInput = z.infer<typeof calendarEventSchema>;
