"use client";

import Link from "next/link";
import {
  CalendarDays,
  Check,
  MessageCircle,
  Star,
  WalletCards,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MobileDashboardNav } from "./dashboard-shell";
import {
  getProfileCompletion,
  getProfileSetupItems,
} from "../profile/profile-completion";
import { useTenantProfile } from "../profile/profile.store";

const stats = [
  ["6", "Upcoming bookings", CalendarDays],
  ["6", "Unread messages", MessageCircle],
  ["6", "New reviews", Star],
  ["₱5,000", "Earnings this month", WalletCards],
] as const;

export function DashboardOverview() {
  const profile = useTenantProfile();
  const completion = getProfileCompletion(profile);
  const setupItems = getProfileSetupItems(profile);

  return (
    <>
      <MobileDashboardNav />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Workspace</h1>
          <p className="mt-1 text-slate-500">
            Manage your services, availability, profile, and earnings.
          </p>
        </div>
        <Link
          href="/tenant-dashboard/services"
          className={buttonVariants({
            className: "bg-[#3c6355] text-white hover:bg-[#2f5044]",
          })}
        >
          + Create Service
        </Link>
      </div>
      <section className="mt-7 max-w-[760px]">
        <p className="text-xs font-semibold uppercase text-slate-400">
          Profile completeness
        </p>
        <strong className="text-4xl">{completion}%</strong>
        <div className="h-2 w-48 rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-[#3c6355]"
            style={{ width: `${completion}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-slate-600">
          A complete profile gets 3× more booking requests.
        </p>
      </section>
      <Card className="mt-6 max-w-[940px] bg-white p-5 shadow-none">
        <div className="flex justify-between">
          <h2 className="font-semibold">Finish setting up</h2>
          <Link
            href="/tenant-dashboard/profile"
            className="font-semibold text-[#3c6355]"
          >
            Go to profile
          </Link>
        </div>
        {setupItems.map(({ id, label, href, actionLabel, complete }) => (
          <div
            key={id}
            className="flex items-center justify-between border-b py-3 last:border-0"
          >
            <span className="flex items-center gap-2">
              {complete ? (
                <span className="grid size-7 place-items-center rounded-full bg-[#3c6355] text-white">
                  <Check size={16} />
                </span>
              ) : (
                <span className="size-7 rounded-full border border-slate-300" />
              )}
              {label}
            </span>
            {!complete && actionLabel ? (
              <Link
                href={href}
                className="font-semibold text-[#3c6355] hover:underline"
              >
                {actionLabel}
              </Link>
            ) : null}
          </div>
        ))}
      </Card>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([value, label, Icon]) => (
          <Card key={label} className="bg-white p-5 text-center shadow-none">
            <Icon className="mx-auto mb-4 size-5 text-[#8b5cf6]" />
            <strong className="block text-3xl">{value}</strong>
            <span className="text-sm text-slate-500">{label}</span>
          </Card>
        ))}
      </div>
      <div className="mt-8 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card className="bg-white p-5 shadow-none">
          <h2 className="mb-4 text-lg font-semibold">Recent Activity</h2>
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex gap-3 border-b py-3 last:border-0">
              <CalendarDays className="mt-1 text-slate-300" />
              <div>
                <strong className="block text-sm">
                  Juan Dela Cruz requested full grooming package
                </strong>
                <span className="text-sm text-slate-400">Today at 10 pm</span>
              </div>
            </div>
          ))}
        </Card>
        <Card className="bg-white p-5 shadow-none">
          <h2 className="text-lg font-semibold">Tips for you</h2>
          <p className="mt-4 text-slate-600">
            Providers who reply within an hour get booked 2× more often. Turn on
            chat notifications to stay quick.
          </p>
        </Card>
      </div>
    </>
  );
}
