"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog } from "@base-ui/react/dialog";
import { X, AlertTriangle, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarSelect } from "./calendar-controls";
import { deleteCalendarEvent, saveCalendarEvent } from "../actions";
import { calendarEventSchema } from "../schemas";
import { toInstant, toLocalInput, dateLabel, manilaDate, timeLabel } from "../dates";
import type { CalendarEvent } from "../types";

export function EventDialog({ event, date, businessId, onClose, onSaved, conflicting }: {
  event: CalendarEvent | null; date: string; businessId: string; onClose: () => void;
  onSaved: (message: string) => void; conflicting: boolean;
}) {
  const appointment = event?.type === "appointment";
  const [editing, setEditing] = useState(!event);
  const [editVersion, setEditVersion] = useState(event?.updatedAt);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    title: event?.title ?? "", description: event?.description ?? "", location: event?.location ?? "",
    type: event?.type === "event" ? "event" : "meeting", status: event?.status ?? "Confirmed",
    start: event ? toLocalInput(event.startsAt) : `${date}T09:00`,
    end: event ? toLocalInput(event.endsAt) : `${date}T10:00`,
  });
  const setField = (field: keyof typeof draft, value: string) => setDraft((current) => ({ ...current, [field]: value }));
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || appointment) return;
    setError("");
    let input;
    try { input = { businessId, id: event?.id.split(":")[1], updatedAt: editVersion, title: draft.title, description: draft.description,
      location: draft.location, type: draft.type, status: draft.status, startsAt: toInstant(draft.start), endsAt: toInstant(draft.end) }; }
    catch { setError("Enter a valid start and end date/time."); return; }
    const parsed = calendarEventSchema.safeParse(input);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setBusy(true);
    try {
      const result = await saveCalendarEvent(parsed.data);
      if (!result.ok) { setError(result.error); return; }
      onSaved(result.conflicts > 0 ? `Event saved. ${result.conflicts} overlapping schedule(s) need review.` : result.conflicts < 0 ? "Event saved. Conflict checks are temporarily unavailable; review your calendar." : "Event saved.");
    } catch { setError("Unable to save. Check your connection and try again."); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!event || appointment || busy) return;
    setBusy(true); setError("");
    try {
      const result = await deleteCalendarEvent({ businessId, id: event.id.split(":")[1], updatedAt: editVersion });
      if (!result.ok) setError(result.error);
      else onSaved("Event deleted.");
    } catch { setError("Unable to delete. Check your connection and try again."); }
    finally { setBusy(false); }
  };
  return <Dialog.Root open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-[70] bg-black/30 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
      <Dialog.Popup className="fixed top-1/2 left-1/2 z-[71] max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-white p-5 shadow-xl outline-none sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div><Dialog.Title className="text-xl font-semibold">{editing ? event ? "Edit event" : "New event" : appointment ? "Appointment details" : "Event details"}</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-slate-500">{appointment ? "Linked to your appointment inbox." : "Internal scheduling for your business."} Times in Asia/Manila.</Dialog.Description></div>
          <Button aria-label="Close event" variant="ghost" size="icon" disabled={busy} onClick={onClose}><X className="size-4" /></Button>
        </div>
        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {editing && !appointment ? <form onSubmit={save} className="space-y-4">
          <label className="block space-y-1 text-sm font-medium"><span>Title</span><Input required maxLength={160} value={draft.title} onChange={(e) => setField("title", e.target.value)} autoFocus /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><p className="text-sm font-medium">Event type</p><CalendarSelect label="Event type" value={draft.type} onChange={(v) => setField("type", v)} options={[{ value: "meeting", label: "Meeting" }, { value: "event", label: "Custom event" }]} /></div>
            <div className="space-y-1"><p className="text-sm font-medium">Status</p><CalendarSelect label="Event status" value={draft.status} onChange={(v) => setField("status", v)} options={["Confirmed", "Completed", "Cancelled"].map((v) => ({ value: v, label: v }))} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block min-w-0 space-y-1 text-sm font-medium"><span>Start</span><Input type="datetime-local" required value={draft.start} onChange={(e) => setField("start", e.target.value)} /></label>
            <label className="block min-w-0 space-y-1 text-sm font-medium"><span>End</span><Input type="datetime-local" required value={draft.end} onChange={(e) => setField("end", e.target.value)} /></label>
          </div>
          <label className="block space-y-1 text-sm font-medium"><span>Location (optional)</span><Input maxLength={240} value={draft.location} onChange={(e) => setField("location", e.target.value)} /></label>
          <label className="block space-y-1 text-sm font-medium"><span>Description (optional)</span><textarea className="min-h-24 w-full resize-y rounded-md border p-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-[#3c6355]" maxLength={4000} value={draft.description} onChange={(e) => setField("description", e.target.value)} /></label>
          <p className="text-xs text-slate-500">Overlaps are flagged after saving. Existing appointments are never moved or cancelled by this event.</p>
          <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy} className="bg-[#3c6355] text-white">{busy ? "Saving…" : "Save event"}</Button></div>
        </form> : event && <div className="space-y-5">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-[#3c6355]">{event.type} · {event.status}</p><h3 className="mt-2 break-words text-xl font-semibold">{event.title}</h3></div>
          <div className="flex gap-3 rounded-xl bg-[#f3f7f5] p-4"><CalendarClock className="mt-1 size-5 shrink-0 text-[#3c6355]" /><div className="text-sm"><p>{dateLabel(manilaDate(event.startsAt), { weekday: "short", month: "long", day: "numeric", year: "numeric" })}</p><p className="mt-1 font-medium">{timeLabel(event.startsAt)} – {manilaDate(event.endsAt) !== manilaDate(event.startsAt) ? `${dateLabel(manilaDate(event.endsAt))}, ` : ""}{timeLabel(event.endsAt)}</p>{event.durationEstimated && <p className="mt-2 text-xs text-slate-600">Estimated duration: a service without a saved duration uses 60 minutes.</p>}</div></div>
          {conflicting && <p className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="size-5 shrink-0" />This event overlaps another active schedule. Review staffing and availability.</p>}
          <dl className="space-y-3 text-sm">{[["Customer", event.customer], ["Booking reference", event.reference], ["Pet", event.pet], ["Location", event.location], ["Notes", event.description]].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{value}</dd></div>)}</dl>
          {appointment ? <Button nativeButton={false} render={<Link href="/tenant-dashboard/appointments" />} className="w-full bg-[#3c6355] text-white">Manage in Appointments</Button> : pendingDelete ? <div className="rounded-xl border border-red-200 p-4"><p className="mb-3 text-sm">Delete this internal event? Customer appointments will remain unchanged.</p><div className="flex justify-end gap-2"><Button disabled={busy} variant="outline" onClick={() => setPendingDelete(false)}>Keep event</Button><Button disabled={busy} variant="destructive" onClick={remove}>{busy ? "Deleting…" : "Delete event"}</Button></div></div> : <div className="flex justify-between border-t pt-4"><Button variant="ghost" className="text-red-700" onClick={() => { setEditVersion(event.updatedAt); setPendingDelete(true); }}>Delete event</Button><Button className="bg-[#3c6355] text-white" onClick={() => {
            setDraft({ title: event.title, description: event.description, location: event.location, type: event.type, status: event.status, start: toLocalInput(event.startsAt), end: toLocalInput(event.endsAt) });
            setEditVersion(event.updatedAt); setEditing(true);
          }}>Edit / reschedule</Button></div>}
        </div>}
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}
