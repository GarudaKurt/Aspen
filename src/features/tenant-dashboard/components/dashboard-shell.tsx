"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./dashboard-sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-[#fafaf9] text-[#171817]">
        <header className="mx-auto flex max-w-[1440px] items-center justify-between border-b border-slate-200 px-5 py-6 sm:px-8">
          <Link href="/tenant-dashboard" className="text-2xl font-bold">
            Logo here
          </Link>
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2">
            <span className="grid size-9 place-items-center rounded-full bg-[#b78a68] text-sm font-semibold text-white">
              PS
            </span>
            <span className="hidden sm:block">
              <strong className="block leading-4">PawSpot</strong>
              <small className="text-slate-500">Service provider</small>
            </span>
          </div>
        </header>
        <div className="mx-auto flex max-w-[1440px]">
          <DashboardSidebar />
          <main className="min-w-0 flex-1 p-5 sm:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export function MobileDashboardNav() {
  const { open, setOpen } = useSidebar();

  return (
    <div className="mb-5 flex gap-2 overflow-x-auto lg:hidden">
      <Button variant="outline" size="icon" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
        <Menu />
      </Button>
      {[
        "Dashboard",
        "Profile",
        "Services",
        "Chat",
        "Notifications",
        "Calendar",
      ].map((item) => (
        <Link
          key={item}
          href={`/tenant-dashboard/${item === "Dashboard" ? "" : item.toLowerCase()}`}
          className="inline-flex h-8 shrink-0 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium hover:bg-slate-50"
        >
          {item}
        </Link>
      ))}
    </div>
  );
}
