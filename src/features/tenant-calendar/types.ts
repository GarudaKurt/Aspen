import type { AppointmentStatus } from "@/features/appointments/types";

export type CalendarMode = "month" | "week" | "day" | "agenda";
export type CalendarEventType = "appointment" | "meeting" | "event";
export type CalendarEvent = {
  id: string;
  type: CalendarEventType;
  title: string;
  description: string;
  location: string;
  status: AppointmentStatus;
  startsAt: string;
  endsAt: string;
  updatedAt: string;
  customer?: string;
  reference?: string;
  pet?: string;
  durationEstimated?: boolean;
};
export type CalendarData = {
  events: CalendarEvent[];
  truncated: boolean;
  unscheduled: number;
};
