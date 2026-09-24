import type { CalendarEvent, Conversation, ServiceItem } from "./types";

export const conversations: Conversation[] = [
  { id: "juan", name: "Juan Dela Cruz", initials: "JD", preview: "Is 2pm available today?", timestamp: "10:12 PM", online: true, messages: [
    { id: "m1", body: "Is 2pm available today?", timestamp: "10:12 PM", from: "customer" },
    { id: "m2", body: "Yes, I can fit you in at 2pm.", timestamp: "10:15 PM", from: "provider" },
  ]},
  { id: "kurt", name: "Kurt Tyler", initials: "KT", preview: "Thank you so much...", timestamp: "Yesterday", messages: [
    { id: "m3", body: "Thank you so much for the update.", timestamp: "Yesterday", from: "customer" },
  ]},
];

export function getCalendarEvents(referenceDate = new Date()): CalendarEvent[] {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const dateKey = (day: number) =>
    new Date(year, month, day).toISOString().slice(0, 10);

  return [
    { id: "e1", title: "Full Grooming", date: dateKey(5), time: "2:00 PM", type: "booking", customer: "Juan D." },
    { id: "e2", title: "Boarding drop-off", date: dateKey(12), time: "9:00 AM", type: "booking", customer: "Maria S." },
    { id: "e3", title: "Team check-in", date: dateKey(19), time: "11:30 AM", type: "meeting", customer: "Staff" },
    { id: "e4", title: "Available slot", date: dateKey(26), time: "1:00 PM", type: "availability", customer: "Open" },
  ];
}

export const services: ServiceItem[] = [
  { id: "s1", title: "Full Grooming Package", price: "₱900", duration: "90 min", status: "Active" },
  { id: "s2", title: "Basic Bath & Trim", price: "₱450", duration: "60 min", status: "Active" },
  { id: "s3", title: "Full Grooming Package", price: "₱900", duration: "90 min", status: "Draft" },
  { id: "s4", title: "Overnight Boarding", price: "₱900", duration: "24 hr", status: "Paused" },
];
