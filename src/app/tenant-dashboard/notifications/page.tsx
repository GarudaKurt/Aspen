"use client";

import { useState } from "react";
import { CalendarDays, CreditCard, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MobileDashboardNav } from "@/features/tenant-dashboard/components/dashboard-shell";

const notifications = [
  {
    id: "n1",
    type: "Bookings",
    title: "New booking request from Juan Dela Cruz",
    detail: "Full Grooming Package · Sat, Sep 20 · 2:00 PM",
    icon: CalendarDays,
  },
  {
    id: "n2",
    type: "Reviews",
    title: "Maria Santos left a 5-star review",
    detail: '"Bella looks amazing, thank you!"',
    icon: Star,
  },
  {
    id: "n3",
    type: "Payments",
    title: "Payment received — ₱650",
    detail: "Overnight Boarding · Maria Santos",
    icon: CreditCard,
  },
];

export default function TenantNotificationsPage() {
  const [filter, setFilter] = useState("All");
  const visible =
    filter === "All"
      ? notifications
      : notifications.filter((item) => item.type === filter);
  return (
    <>
      <MobileDashboardNav />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="mt-1 text-slate-500">
            Booking requests, payments, reviews, and messages from PawSpot.
          </p>
        </div>
        <Button variant="outline">Mark all as read</Button>
      </div>
      <div className="mt-7 flex flex-wrap gap-2">
        {["All", "Bookings", "Payments", "Reviews", "System"].map((item) => (
          <Button
            key={item}
            variant={filter === item ? "default" : "outline"}
            onClick={() => setFilter(item)}
            className={filter === item ? "bg-[#3c6355] text-white" : ""}
          >
            {item}
          </Button>
        ))}
      </div>
      <Card className="mt-7 p-5 bg-white shadow-none">
        {visible.length ? (
          visible.map(({ id, title, detail, icon: Icon, type }) => (
            <div
              key={id}
              className="flex items-center gap-4 border-b py-5 last:border-0"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-500">
                <Icon />
              </span>
              <div className="min-w-0 flex-1">
                <strong className="block">{title}</strong>
                <span className="text-sm text-slate-500">{detail}</span>
              </div>
              <span className="hidden text-sm text-slate-400 sm:block">
                {type === "Bookings" ? "10:20 AM" : "Yesterday"}
              </span>
            </div>
          ))
        ) : (
          <p className="py-12 text-center text-slate-500">
            No notifications match this filter.
          </p>
        )}
      </Card>
    </>
  );
}
