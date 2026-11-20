"use server";

import { revalidatePath } from "next/cache";
import { calendarDeleteSchema, calendarEventSchema } from "./schemas";
import { calendarAccess, calendarFailure, CalendarError } from "./server";

export async function saveCalendarEvent(input: unknown): Promise<{ ok: true; conflicts: number } | { ok: false; error: string }> {
  const parsed = calendarEventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    const value = parsed.data;
    const { supabase, business } = await calendarAccess(value.businessId, true);
    const payload = { title: value.title, description: value.description, location: value.location, event_type: value.type,
      status: value.status, starts_at: value.startsAt, ends_at: value.endsAt };
    const query = value.id
      ? supabase.from("business_calendar_events").update(payload).eq("id", value.id).eq("business_id", business.id)
        .eq("updated_at", value.updatedAt!).is("deleted_at", null)
      : supabase.from("business_calendar_events").insert({ ...payload, business_id: business.id });
    const { data, error } = await query.select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new CalendarError("This event changed or was deleted. Close it and reopen the latest version.", 409);
    let conflicts = 0;
    if (value.status === "Confirmed") {
      const [appointments, events] = await Promise.all([
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("business_id", business.slug)
          .in("status", ["Pending", "Confirmed"]).lt("starts_at", value.endsAt).gt("ends_at", value.startsAt),
        supabase.from("business_calendar_events").select("id", { count: "exact", head: true }).eq("business_id", business.id)
          .neq("id", data.id).is("deleted_at", null).eq("status", "Confirmed").lt("starts_at", value.endsAt).gt("ends_at", value.startsAt),
      ]);
      // A conflict check failure must not report a successfully saved event as failed.
      if (appointments.error || events.error) conflicts = -1;
      else conflicts = (appointments.count ?? 0) + (events.count ?? 0);
    }
    revalidatePath("/tenant-dashboard/calendar");
    return { ok: true, conflicts };
  } catch (error) { return { ok: false, error: calendarFailure(error).error }; }
}

export async function deleteCalendarEvent(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = calendarDeleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Reload the event before deleting it." };
  try {
    const { businessId, id, updatedAt } = parsed.data;
    const { supabase } = await calendarAccess(businessId, true);
    const { data, error } = await supabase.from("business_calendar_events").update({ deleted_at: new Date().toISOString() })
      .eq("id", id).eq("business_id", businessId).eq("updated_at", updatedAt).is("deleted_at", null).select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new CalendarError("This event changed or was deleted. Close it and reopen the latest version.", 409);
    revalidatePath("/tenant-dashboard/calendar");
    return { ok: true };
  } catch (error) { return { ok: false, error: calendarFailure(error).error }; }
}
