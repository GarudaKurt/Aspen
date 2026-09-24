"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ChartNoAxesColumn, LayoutDashboard, MessageCircle, Bell, UserRound, ShoppingCart } from "lucide-react";
import { Sidebar, SidebarContent, SidebarTrigger } from "@/components/ui/sidebar";
import type { DashboardNavItem } from "../types";

const navItems: DashboardNavItem[] = [
  { label: "Dashboard", href: "/tenant-dashboard", icon: "dashboard", group: "main" },
  { label: "Profile", href: "/tenant-dashboard/profile", icon: "profile", group: "main" },
  { label: "Services", href: "/tenant-dashboard/services", icon: "services", group: "main" },
  { label: "Chat", href: "/tenant-dashboard/chat", icon: "chat", group: "content" },
  { label: "Notifications", href: "/tenant-dashboard/notifications", icon: "notifications", group: "content" },
  { label: "Calendar", href: "/tenant-dashboard/calendar", icon: "calendar", group: "business" },
  { label: "Analytics", href: "/tenant-dashboard/analytics", icon: "analytics", group: "business" },
];

const icons = { dashboard: LayoutDashboard, profile: UserRound, services: ShoppingCart, chat: MessageCircle, notifications: Bell, calendar: CalendarDays, analytics: ChartNoAxesColumn };

export function DashboardSidebar() {
  const pathname = usePathname();
  const groups = [["main", "Main"], ["content", "Content"], ["business", "Business"]] as const;
  return <Sidebar className="hidden min-h-[calc(100vh-5rem)] lg:block">
    <SidebarContent className="p-5">
      <div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-semibold">Menu</h2><SidebarTrigger /></div>
      {groups.map(([group, label]) => <div key={group} className="mb-7">
        <p className="mb-2 px-3 text-sm text-slate-400">{label}</p>
        <nav className="space-y-1" aria-label={label}>
          {navItems.filter((item) => item.group === group).map((item) => {
            const Icon = icons[item.icon as keyof typeof icons];
            const active = item.href === "/tenant-dashboard" ? pathname === item.href : pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-[#e8f5ef] text-[#3c6355]" : "text-slate-700 hover:bg-slate-50"}`} aria-current={active ? "page" : undefined}><Icon className="size-5" />{item.label}</Link>;
          })}
        </nav>
      </div>)}
    </SidebarContent>
  </Sidebar>;
}
