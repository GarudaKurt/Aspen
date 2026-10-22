"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Bell, CalendarDays, CreditCard, MessageCircle, ShieldCheck, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type NotificationKind = "Appointments" | "Bookings" | "Payments" | "Reviews" | "Messages" | "Account" | "System";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  timestamp: string;
  href?: string;
  read?: boolean;
};

type Audience = "customer" | "provider";
type Filter = "All" | "Unread" | "Appointments" | NotificationKind;

const iconByKind = {
  Appointments: CalendarDays,
  Bookings: CalendarDays,
  Payments: CreditCard,
  Reviews: Star,
  Messages: MessageCircle,
  Account: ShieldCheck,
  System: Bell,
} as const;

const customerFilters: Filter[] = ["All", "Unread", "Appointments"];
const providerFilters: Filter[] = ["All", "Bookings", "Payments", "Reviews", "System"];

function iconClasses(kind: NotificationKind) {
  if (kind === "Appointments") return "bg-emerald-50 text-[#3c6355]";
  if (kind === "Messages") return "bg-sky-50 text-sky-700";
  if (kind === "Account") return "bg-violet-50 text-violet-700";
  if (kind === "Reviews") return "bg-amber-50 text-amber-700";
  if (kind === "Payments") return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-slate-600";
}

export function NotificationCenter({
  notifications,
  audience,
  navigation,
}: {
  notifications: AppNotification[];
  audience: Audience;
  navigation?: ReactNode;
}) {
  const [filter, setFilter] = useState<Filter>("All");
  const [readIds, setReadIds] = useState(() => new Set(notifications.filter((item) => item.read).map((item) => item.id)));
  const filters = audience === "customer" ? customerFilters : providerFilters;
  const unreadCount = notifications.filter((item) => !readIds.has(item.id)).length;

  const visible = useMemo(() => notifications.filter((item) => {
    if (filter === "Unread") return !readIds.has(item.id);
    if (filter === "All") return true;
    return item.kind === filter;
  }), [filter, notifications, readIds]);

  const markRead = (id: string) => setReadIds((current) => new Set(current).add(id));
  const markAllRead = () => setReadIds(new Set(notifications.map((item) => item.id)));

  return (
    <>
      {navigation}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {audience === "provider" && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c5714e]">Business inbox</p>}
          <h1 className="mt-2 text-3xl font-bold text-[#3c6355]">Notifications</h1>
          <p className="mt-2 text-sm text-slate-500">{audience === "customer" ? "Stay up to date with your appointments and messages." : "Booking requests, payments, reviews, and messages from PawSpot."}</p>
        </div>
        <Button type="button" variant="outline" onClick={markAllRead} disabled={!unreadCount}>Mark all as read</Button>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-2">
        {filters.map((item) => <Button key={item} type="button" variant="ghost" onClick={() => setFilter(item)} className={`rounded-full px-3 ${filter === item ? "bg-[#e8f5ef] text-[#3c6355]" : "text-slate-500 hover:bg-white"}`}>{item}{item === "Unread" && unreadCount > 0 ? <span className="ml-1 rounded-full bg-[#3c6355] px-1.5 text-[10px] text-white">{unreadCount}</span> : null}</Button>)}
      </div>

      <Card className="mt-5 overflow-hidden border-[#e1e5e2] bg-white p-0 shadow-none">
        {visible.length ? <div className="divide-y divide-slate-100">{visible.map((notification) => <NotificationRow key={notification.id} notification={notification} read={readIds.has(notification.id)} onRead={() => markRead(notification.id)} />)}</div> : <EmptyState audience={audience} filter={filter} />}
      </Card>
    </>
  );
}

function NotificationRow({ notification, read, onRead }: { notification: AppNotification; read: boolean; onRead: () => void }) {
  const Icon = iconByKind[notification.kind];
  const content = <div className={`flex items-start gap-4 px-4 py-5 transition-colors sm:px-5 ${read ? "bg-white" : "bg-[#f7faf8]"}`}><span className={`mt-0.5 grid size-11 shrink-0 place-items-center rounded-xl ${iconClasses(notification.kind)}`}><Icon className="size-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1"><strong className="text-sm text-[#202321]">{notification.title}</strong><span className="shrink-0 text-xs text-slate-400">{notification.timestamp}</span></div><p className="mt-1 text-sm leading-5 text-slate-500">{notification.detail}</p></div>{!read && <span className="mt-2 size-2 shrink-0 rounded-full bg-[#c5714e]" aria-label="Unread" />}</div>;
  if (!notification.href) return <button type="button" onClick={onRead} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3c6355]">{content}</button>;
  return <Link href={notification.href} onClick={onRead} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3c6355]">{content}</Link>;
}

function EmptyState({ audience, filter }: { audience: Audience; filter: Filter }) {
  return <div className="px-6 py-16 text-center"><Bell className="mx-auto size-10 text-[#3c6355]" /><h2 className="mt-4 text-lg font-semibold">No {filter === "All" ? "notifications" : filter.toLowerCase() + " notifications"} yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{audience === "customer" ? "Appointment updates and messages from your service providers will appear here." : "New activity for your business will appear here."}</p></div>;
}
