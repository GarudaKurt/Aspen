import { IconTile } from "@/components/ui/icon-tile";
import Link from "next/link";
import { ArrowUpRight, CalendarCheck, CalendarDays, Clock3, ImagePlus, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { dateLabel, manilaDate, timeLabel } from "@/features/tenant-calendar/dates";
import type { getDashboardOverview } from "../overview-data";

type Overview = Awaited<ReturnType<typeof getDashboardOverview>>;
const appointmentsPath = "/tenant-dashboard/appointments";

export function DashboardOverview({ name, needsCover, overview }: {
  name: string;
  needsCover: boolean;
  overview: Overview;
}) {
  const metrics = [
    { label: "Pending requests", count: overview.pending.count, icon: Clock3, href: appointmentsPath },
    { label: "Upcoming appointments", count: overview.upcoming.count, icon: CalendarCheck, href: "/tenant-dashboard/calendar" },
    { label: "Unread messages", count: overview.unread, icon: MessageCircle, href: "/tenant-dashboard/chat" },
  ];
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Dashboard</h1>
          <p className="mt-1 break-words text-slate-600">{name}</p>
        </div>
        <Link href="/tenant-dashboard/calendar" className={buttonVariants({ variant: "outline" })}>
          <CalendarDays aria-hidden="true" /> Open calendar
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {metrics.map(({ label, count, icon: Icon, href }) => (
          <Link key={label} href={href} className="group flex items-center justify-between gap-3 rounded-xl border p-4 transition-colors hover:border-[#3c6355] focus-visible:outline-2 focus-visible:outline-[#3c6355] sm:flex-col sm:items-start lg:p-5">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <IconTile icon={Icon} />{label}
            </span>
            {count === null ? <span className="text-sm text-slate-600">Unavailable</span>
              : <strong className="text-3xl font-semibold tabular-nums">{count.toLocaleString("en-PH")}</strong>}
          </Link>
        ))}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <BookingPanel title="Awaiting your response" bookings={overview.pending} empty="You’re all caught up. New booking requests will appear here." />
        <BookingPanel title="Next appointments" bookings={overview.upcoming} empty="No upcoming confirmed appointments. Confirmed bookings will appear here in date order." />
      </div>

      {needsCover && <Card className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 shadow-none">
        <div className="flex min-w-0 items-center gap-3">
          <IconTile icon={ImagePlus} />
          <div>
            <h2 className="font-semibold">Add a business cover photo</h2>
            <p className="text-sm text-slate-600">Show customers your business on its public profile.</p>
          </div>
        </div>
        <Link href="/tenant-dashboard/profile" className={buttonVariants({ variant: "outline" })}>Add photo</Link>
      </Card>}
    </div>
  );
}

function BookingPanel({ title, bookings, empty }: { title: string; bookings: Overview["pending"]; empty: string }) {
  return (
    <Card className="min-w-0 bg-white p-5 shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Link href={appointmentsPath} aria-label={`View all appointments: ${title}`}
          className="inline-flex items-center gap-1 rounded text-sm font-medium text-[#3c6355] hover:underline">
          View all <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      {bookings.rows === null ? <p role="alert" className="mt-5 text-sm text-slate-600">Appointments could not be loaded. Refresh to try again.</p>
        : bookings.rows.length === 0 ? <p className="mt-5 border-t pt-5 text-sm leading-6 text-slate-600">{empty}</p>
        : <ul className="mt-3 divide-y border-t">
          {bookings.rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 last:pb-0">
              <div className="min-w-0 break-words">
                <p className="font-medium">{row.service_name}</p>
                <p className="text-sm text-slate-600">{[row.pet_name, row.customer_name].filter(Boolean).join(" · ")}</p>
              </div>
              {row.starts_at ? <time dateTime={row.starts_at} className="text-sm tabular-nums text-slate-600">
                {dateLabel(manilaDate(row.starts_at), { month: "short", day: "numeric", year: "numeric" })} · {timeLabel(row.starts_at)}
              </time> : <span className="text-sm text-slate-600">Time unavailable</span>}
            </li>
          ))}
        </ul>}
    </Card>
  );
}
