"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, Check, ChevronLeft, PawPrint, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { services } from "@/features/tenant-dashboard/mock-data";

type Period = "Morning" | "Afternoon" | "Evening";

type AppointmentDraft = {
  serviceIds: string[];
  date: string;
  period: Period;
  time: string;
  petName: string;
  petType: string;
  reason: string;
  fullName: string;
  phone: string;
  email: string;
};

type Step = { label: string; path: string; icon: LucideIcon };
const steps: Step[] = [
  { label: "Service", path: "/request-appointment", icon: PawPrint },
  { label: "Date and Time", path: "/request-appointment/date-time", icon: CalendarDays },
  { label: "Pet", path: "/request-appointment/pet", icon: PawPrint },
  { label: "Your details", path: "/request-appointment/details", icon: UserRound },
];
const timeSlots: Record<Period, string[]> = { Morning: ["8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM"], Afternoon: ["12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM"], Evening: ["5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM"] };
const initialDraft: AppointmentDraft = { serviceIds: [], date: "", period: "Morning", time: "", petName: "", petType: "", reason: "", fullName: "", phone: "", email: "" };

export function AppointmentPage() {
  const pathname = usePathname();
  const router = useRouter();
  const isConfirmation = pathname === "/request-appointment/confirmation";
  const activeIndex = Math.max(0, steps.findIndex((step) => step.path === pathname));
  const [draft, setDraft] = useState<AppointmentDraft>(initialDraft);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = window.sessionStorage.getItem("aspen-appointment-draft");
    if (saved) setDraft({ ...initialDraft, ...JSON.parse(saved) });
  }, []);
  useEffect(() => {
    window.sessionStorage.setItem("aspen-appointment-draft", JSON.stringify(draft));
  }, [draft]);

  const update = <K extends keyof AppointmentDraft>(key: K, value: AppointmentDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const toggleService = (id: string) => update("serviceIds", draft.serviceIds.includes(id) ? draft.serviceIds.filter((item) => item !== id) : [...draft.serviceIds, id]);

  const next = () => {
    if (activeIndex === 0 && !draft.serviceIds.length) return setError("Select at least one service to continue.");
    if (activeIndex === 1 && (!draft.date || !draft.time)) return setError("Choose a date and time to continue.");
    if (activeIndex === 2 && (!draft.petName || !draft.petType || !draft.reason)) return setError("Complete your pet's details to continue.");
    if (activeIndex === 3 && (!draft.fullName || !draft.phone || !draft.email)) return setError("Complete your contact details to send the request.");
    setError("");
    router.push(activeIndex === steps.length - 1 ? "/request-appointment/confirmation" : steps[activeIndex + 1].path);
  };
  const back = () => router.push(activeIndex === 0 ? "/#browse" : steps[activeIndex - 1].path);

  if (isConfirmation) return <ConfirmationPage draft={draft} />;

  return <main className="min-h-screen bg-white px-4 py-8 text-[#171817] sm:px-8 lg:px-12">
    <div className="mx-auto max-w-[1040px]">
      <header className="flex items-center justify-between border-b border-[#dededb] pb-5">
        <button type="button" onClick={back} className="inline-flex items-center gap-2 text-sm font-medium hover:text-[#3c6355]"><ChevronLeft size={16} />Back</button>
        <Link href="/" className="text-base font-medium tracking-wide">Logo here</Link><span className="w-16" aria-hidden="true" />
      </header>
      <div className="py-8 sm:py-10"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c5714e]">Customer appointment</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">Request an appointment</h1><p className="mt-2 max-w-[560px] text-sm leading-5 text-[#777b78]">Tell us what your pet needs and pick a time that works. The provider will confirm within the hour.</p><p className="mt-3 text-sm font-semibold">Step {activeIndex + 1} of {steps.length}</p></div>
      <div className="grid gap-8 lg:grid-cols-[170px_minmax(0,1fr)] lg:items-start">
        <div><ProviderCard /><AppointmentStepper activeIndex={activeIndex} /></div>
        <Card className="rounded-xl border-[#d7d8d5] bg-white p-5 shadow-none sm:p-8">
          {activeIndex === 0 && <ServiceStep selected={draft.serviceIds} onToggle={toggleService} />}
          {activeIndex === 1 && <DateStep date={draft.date} period={draft.period} time={draft.time} onDate={(value) => update("date", value)} onPeriod={(value) => { update("period", value); if (!timeSlots[value].includes(draft.time)) update("time", ""); }} onTime={(value) => update("time", value)} />}
          {activeIndex === 2 && <PetStep draft={draft} update={update} />}
          {activeIndex === 3 && <DetailsStep draft={draft} update={update} />}
          {error && <p role="alert" className="mt-5 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#e1e2df] pt-5 sm:flex-row sm:items-center sm:justify-between"><Button variant="ghost" type="button" onClick={back} className="justify-start px-0 hover:bg-transparent hover:text-[#3c6355]"><ChevronLeft size={16} />{activeIndex === 0 ? "Back to search" : "Back"}</Button><div className="flex flex-col gap-3 sm:flex-row"><Button type="button" variant="outline" onClick={() => router.push("/")}>Save and exit</Button><Button type="button" onClick={next} className="bg-[#3c6355] text-white hover:bg-[#2f5044]">{activeIndex === steps.length - 1 ? "Request appointment" : "Save and continue"}</Button></div></div>
        </Card>
      </div>
    </div>
  </main>;
}

function ProviderCard() {
  return <Card className="mb-6 border-0 bg-[#f1f2f8] p-4 shadow-none"><div className="grid size-11 place-items-center rounded-lg bg-[#3c6355] text-white">＋</div><h2 className="mt-3 text-sm font-bold">Kalinga Animal Hospital</h2><p className="text-[10px] text-slate-500">Vet Clinic · Kalayaan Ave, QC</p><p className="mt-1 text-xs font-semibold text-slate-700">⭐ 4.9 Ratings</p></Card>;
}

function AppointmentStepper({ activeIndex }: { activeIndex: number }) {
  return <nav aria-label="Appointment progress" className="overflow-x-auto pb-2 lg:overflow-visible"><ol className="flex min-w-max items-start lg:block lg:min-w-0">{steps.map(({ label, icon: Icon }, index) => { const current = index === activeIndex; const complete = index < activeIndex; return <li key={label} className="relative flex flex-1 items-start lg:block lg:pb-7"><div className={`relative z-10 flex min-w-[84px] flex-col items-center gap-2 text-center text-xs lg:flex-row lg:items-center lg:gap-2 lg:text-left ${index <= activeIndex ? "text-[#3c6355]" : "text-[#a0a4a1]"}`}><span className={`flex size-9 shrink-0 items-center justify-center rounded-full border-2 bg-white ${current ? "border-[#3c6355] ring-4 ring-[#3c6355]/10" : complete ? "border-[#3c6355] bg-[#3c6355] text-white" : "border-[#cfd2cf]"}`}>{complete ? <Check size={16} /> : <Icon size={16} />}</span><span className="hidden sm:block lg:block"><strong className="block">{label}</strong><small className="block text-[9px] text-[#a0a4a1]">{current ? "Current step" : complete ? "Completed" : "Not selected yet"}</small></span></div>{index < steps.length - 1 && <span aria-hidden="true" className={`absolute z-0 bg-[#cfd2cf] ${complete ? "bg-[#3c6355]" : ""} left-[calc(50%+18px)] right-0 top-4 h-0.5 lg:left-4 lg:right-auto lg:top-9 lg:h-auto lg:w-0.5 lg:-translate-x-1/2 lg:bottom-0`} />}</li>;})}</ol></nav>;
}

function ServiceStep({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  return <FormSection title="Request appointment" description="Choose one or more services you would like to book."><div className="space-y-3">{services.filter((service) => service.status === "Active").map((service) => { const checked = selected.includes(service.id); return <button key={service.id} type="button" onClick={() => onToggle(service.id)} aria-pressed={checked} className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${checked ? "border-[#3c6355] ring-1 ring-[#3c6355]" : "border-[#d7d8d5] hover:border-[#3c6355]"}`}><span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border ${checked ? "border-[#3c6355] bg-[#3c6355] text-white" : "border-[#d7d8d5]"}`}>{checked && <Check size={14} />}</span><span className="min-w-0 flex-1"><strong className="block">{service.title}</strong><span className="block text-sm text-slate-400">{service.description}</span></span><strong className="shrink-0 text-[#3c6355]">{service.price}</strong></button>;})}</div></FormSection>;
}

function DateStep({ date, period, time, onDate, onPeriod, onTime }: { date: string; period: Period; time: string; onDate: (value: string) => void; onPeriod: (value: Period) => void; onTime: (value: string) => void }) {
  const selectedDate = date ? new Date(`${date}T12:00:00`) : undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const availableSlots = date ? timeSlots[period] : [];
  return <FormSection title="Preferred date & time" description="Pick a date, time period, and available slot."><div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]"><div><p className="mb-2 text-sm font-semibold">Date</p><Calendar selected={selectedDate} onSelect={(value) => onDate(`${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`)} disabled={(value) => value < today} /></div><div><p className="text-sm font-semibold">Time of day</p><div className="mt-2 flex flex-wrap gap-2">{(["Morning", "Afternoon", "Evening"] as Period[]).map((item) => <Button key={item} type="button" variant={period === item ? "default" : "outline"} className={period === item ? "bg-[#3c6355] text-white hover:bg-[#2f5044]" : ""} onClick={() => onPeriod(item)} disabled={!date}>{item}</Button>)}</div><p className="mt-5 text-sm font-semibold">{date ? "Available time slots" : "Select a date to see available times"}</p><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{availableSlots.map((slot) => <Button key={slot} type="button" variant="outline" className={time === slot ? "border-[#3c6355] bg-[#e8f5ef] text-[#3c6355]" : ""} onClick={() => onTime(slot)}>{slot}</Button>)}</div></div></div></FormSection>;
}
function PetStep({ draft, update }: { draft: AppointmentDraft; update: <K extends keyof AppointmentDraft>(key: K, value: AppointmentDraft[K]) => void }) {
  return <FormSection title="About your pet" description="Help the provider prepare for your visit."><div className="grid gap-4 sm:grid-cols-2"><Field label="Pet's name"><Input value={draft.petName} onChange={(event) => update("petName", event.target.value)} placeholder="e.g. Mel-mel" /></Field><Field label="Pet's type"><select value={draft.petType} onChange={(event) => update("petType", event.target.value)} className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="">Select type</option><option>Dog</option><option>Cat</option><option>Other</option></select></Field></div><Field label="Reason's for visit"><textarea value={draft.reason} onChange={(event) => update("reason", event.target.value)} className="min-h-28 w-full rounded-md border border-input px-3 py-2 text-sm" placeholder="Tell us what your pet needs." /></Field></FormSection>;
}

function DetailsStep({ draft, update }: { draft: AppointmentDraft; update: <K extends keyof AppointmentDraft>(key: K, value: AppointmentDraft[K]) => void }) {
  return <FormSection title="Your contact details" description="We will use these details to confirm your appointment."><Field label="Full name"><Input value={draft.fullName} onChange={(event) => update("fullName", event.target.value)} placeholder="Your full name" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Phone number"><Input value={draft.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+63 900 000 0000" /></Field><Field label="Email"><Input type="email" value={draft.email} onChange={(event) => update("email", event.target.value)} placeholder="you@example.com" /></Field></div><p className="text-xs text-slate-400">Kalinga Animal Hospital usually responds within 1 hour.</p></FormSection>;
}

function ConfirmationPage({ draft }: { draft: AppointmentDraft }) {
  return <main className="min-h-screen bg-[#fafaf9] px-4 py-10 text-[#171817] sm:px-8"><div className="mx-auto max-w-[760px]"><Link href="/" className="text-sm hover:text-[#3c6355]"><ChevronLeft className="mr-1 inline size-4" />Back</Link><Card className="mt-6 bg-white p-8 text-center shadow-none sm:p-12"><div className="mx-auto grid size-28 place-items-center rounded-full bg-[#3c6355] text-white"><Check size={64} /></div><h1 className="mt-6 text-3xl font-bold">Request sent</h1><p className="mt-2 text-sm text-slate-500">You'll get a message here and by email once Kalinga Animal Hospital confirms your time.</p><div className="mx-auto mt-6 max-w-md rounded-xl border p-5 text-left text-sm"><p><span className="text-slate-500">Services</span><span className="float-right">{draft.serviceIds.length} selected</span></p><p className="mt-2"><span className="text-slate-500">Date</span><span className="float-right">{draft.date || "Not selected"}</span></p><p className="mt-2"><span className="text-slate-500">Time</span><span className="float-right">{draft.time || "Not selected"}</span></p><p className="mt-2"><span className="text-slate-500">Pet</span><span className="float-right">{draft.petName || "Not provided"}</span></p><p className="mt-2"><span className="text-slate-500">Booking #</span><span className="float-right">123456</span></p></div><Button type="button" className="mt-6 w-full max-w-md bg-[#3c6355] text-white hover:bg-[#2f5044]" onClick={() => window.print()}>Download</Button></Card></div></main>;
}

function FormSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="space-y-5"><div><h2 className="text-lg font-bold">{title}</h2><p className="mt-1 text-sm leading-5 text-[#777b78]">{description}</p></div>{children}</section>;
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-2 text-sm font-semibold">{label}{children}</label>;
}
