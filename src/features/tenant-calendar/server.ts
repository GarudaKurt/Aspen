import "server-only";
import type { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { getCurrentProfile, isEmailVerified } from "@/server/auth/session";
import { calendarRangeSchema } from "./schemas";
import type { CalendarData, CalendarEvent } from "./types";
import { manilaDate } from "./dates";

export class CalendarError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function calendarAccess(businessId: string, write = false) {
  const current = await getCurrentProfile();
  if (!current?.user || !isEmailVerified(current.user)) throw new CalendarError("Please sign in again to access your calendar.", 401);
  if (current.profile?.role !== "provider") throw new CalendarError("Provider access is required.", 403);
  const supabase = await createSupabaseServerClient();
  const { data: business, error } = await supabase.from("businesses").select("id, slug, name")
    .eq("id", businessId).eq("owner_id", current.user.id).maybeSingle();
  if (error) throw error;
  if (!business) throw new CalendarError("This business is not available to your account.", 403);
  if (write) {
    const { data: allowed, error: accessError } = await supabase.rpc("can_manage_business_services", { p_business_id: businessId });
    if (accessError) throw accessError;
    if (!allowed) throw new CalendarError("An approved, active business is required to manage calendar events.", 403);
  }
  return { supabase, business };
}

export function calendarFailure(error: unknown) {
  if (error instanceof CalendarError) return { error: error.message, status: error.status };
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
  console.error("Tenant calendar operation failed", { code });
  if (["42P01", "42703", "PGRST204", "PGRST205"].includes(code)) {
    return { error: "Calendar setup is incomplete. Apply Supabase migration 0033_tenant_calendar.sql.", status: 503 };
  }
  return { error: "The calendar could not be updated or loaded. Please try again.", status: 500 };
}

type Row = Record<string, unknown>;
export function mapCalendarEvent(row: Row, appointment: boolean): CalendarEvent {
  return {
    id: `${appointment ? "appointment" : "event"}:${row.id}`,
    type: appointment ? "appointment" : row.event_type as CalendarEvent["type"],
    title: String(appointment ? row.service_name : row.title),
    description: String((appointment ? row.notes : row.description) ?? ""),
    location: String(row.location ?? ""),
    startsAt: String(row.starts_at), endsAt: String(row.ends_at),
    updatedAt: String(row.updated_at), status: row.status as CalendarEvent["status"],
    ...(appointment ? { customer: String(row.customer_name), reference: String(row.booking_reference), pet: String(row.pet_name), durationEstimated: Boolean(row.duration_estimated) } : {}),
  };
}

export async function loadCalendar(input: z.infer<typeof calendarRangeSchema>): Promise<CalendarData> {
  const { supabase, business } = await calendarAccess(input.businessId);
  // Both event sources have a seven-day maximum duration. Bound the start index
  // as well as the overlap check so a busy tenant does not scan all past bookings.
  const earliestStart = new Date(Date.parse(input.start) - 7 * 86_400_000).toISOString();
  const read = async (appointment: boolean) => {
    const rows: Row[] = [];
    for (let offset = 0; offset <= 2000; offset += 500) {
      let query = supabase.from(appointment ? "appointments" : "business_calendar_events")
        .select(appointment
          ? "id, service_name, notes, starts_at, ends_at, updated_at, status, customer_name, booking_reference, pet_name, duration_estimated"
          : "id, title, description, location, event_type, status, starts_at, ends_at, updated_at")
        .eq("business_id", appointment ? business.slug : business.id)
        .gte("starts_at", earliestStart).lt("starts_at", input.end).gt("ends_at", input.start)
        .order("starts_at").order("id").range(offset, offset + 499);
      if (!appointment) query = query.is("deleted_at", null);
      if (input.status !== "all") query = query.eq("status", input.status);
      if (!appointment && input.type !== "all") query = query.eq("event_type", input.type);
      const { data, error } = await query.returns<Row[]>();
      if (error) throw error;
      rows.push(...(data ?? []));
      if ((data?.length ?? 0) < 500) break;
    }
    return rows;
  };
  const [appointments, custom, unscheduled] = await Promise.all([
    input.type === "all" || input.type === "appointment" ? read(true) : Promise.resolve([]),
    input.type !== "appointment" ? read(false) : Promise.resolve([]),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("business_id", business.slug)
      .is("starts_at", null).gte("appointment_date", manilaDate(input.start)).lt("appointment_date", manilaDate(input.end)),
  ]);
  if (unscheduled.error) throw unscheduled.error;
  return {
    events: [...appointments.slice(0, 2000).map((r) => mapCalendarEvent(r, true)), ...custom.slice(0, 2000).map((r) => mapCalendarEvent(r, false))]
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.id.localeCompare(b.id)),
    truncated: appointments.length > 2000 || custom.length > 2000,
    unscheduled: unscheduled.count ?? 0,
  };
}
