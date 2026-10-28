"use client";

import { AspenLogo } from "@/components/brand/aspen-logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChartNoAxesColumn,
  ChevronDown,
  Home,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Bell,
  UserRound,
  ShoppingCart,
  ClipboardList,
  WalletCards,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import type { DashboardNavItem } from "../types";
import { getBusinessInitials } from "../profile/business-initials";

const navItems: DashboardNavItem[] = [
  {
    label: "Dashboard",
    href: "/tenant-dashboard",
    icon: "dashboard",
    group: "overview",
  },
  {
    label: "Profile",
    href: "/tenant-dashboard/profile",
    icon: "profile",
    group: "business",
  },
  {
    label: "Services",
    href: "/tenant-dashboard/services",
    icon: "services",
    group: "business",
  },
  {
    label: "Appointments",
    href: "/tenant-dashboard/appointments",
    icon: "appointments",
    group: "business",
  },
  {
    label: "Calendar",
    href: "/tenant-dashboard/calendar",
    icon: "calendar",
    group: "business",
  },
  {
    label: "Chat",
    href: "/tenant-dashboard/chat",
    icon: "chat",
    group: "inbox",
  },
  {
    label: "Notifications",
    href: "/tenant-dashboard/notifications",
    icon: "notifications",
    group: "inbox",
  },
  {
    label: "Analytics",
    href: "/tenant-dashboard/analytics",
    icon: "analytics",
    group: "account",
  },
  {
    label: "Billing",
    href: "/tenant-dashboard/billing",
    icon: "billing",
    group: "account",
  },
];

const icons = {
  dashboard: LayoutDashboard,
  profile: UserRound,
  services: ShoppingCart,
  appointments: ClipboardList,
  chat: MessageCircle,
  notifications: Bell,
  calendar: CalendarDays,
  analytics: ChartNoAxesColumn,
  billing: WalletCards,
};

export function DashboardSidebar({ businessName, onSignOut }: { businessName: string; onSignOut: () => void }) {
  const pathname = usePathname();
  const { open, setOpen } = useSidebar();
  const groups = [
    ["overview", "Overview"],
    ["business", "Business"],
    ["inbox", "Inbox"],
    ["account", "Insights & account"],
  ] as const;

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    <Sidebar id="provider-navigation" className={`shadow-xl lg:shadow-none ${open ? "2xl:w-72" : ""}`}>
      <SidebarContent
        className={`flex flex-col transition-[padding] duration-200 ${open ? "p-3 lg:p-5" : "p-2 lg:p-2"}`}
      >
        <div
          className={`mb-7 flex shrink-0 items-center gap-2 ${open ? "justify-between" : "justify-center"}`}
        >
          <Link
            href="/"
            aria-label="Aspen homepage"
            title={open ? undefined : "Aspen homepage"}
            onClick={() => { if (window.innerWidth < 1024) setOpen(false); }}
            className="inline-flex min-w-0 items-center gap-2 rounded-md text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3c6355]"
          >
            <AspenLogo size={32} decorative className="shrink-0" />
            {open && <span>Aspen</span>}
          </Link>
          {open && (
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3c6355] lg:hidden"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          )}
          <SidebarTrigger className="hidden lg:inline-flex" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {groups.map(([group, label]) => (
            <div key={group} className="mb-5 last:mb-0">
              {open && <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>}
              <nav className="space-y-1" aria-label={label}>
                {navItems.filter((item) => item.group === group).map((item) => {
                  const Icon = icons[item.icon as keyof typeof icons];
                  const active = item.href === "/tenant-dashboard" ? pathname === item.href : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={open ? undefined : item.label}
                      aria-label={open ? undefined : item.label}
                      onClick={() => { if (window.innerWidth < 1024) setOpen(false); }}
                      className={`flex min-h-11 items-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3c6355] ${open ? "gap-3 px-3" : "justify-center px-2"} ${active ? "bg-[#e8f5ef] text-[#3c6355]" : "text-slate-700 hover:bg-slate-50"}`}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="size-5 shrink-0" aria-hidden="true" />
                      {open && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
        <div className="shrink-0 border-t border-slate-200 pt-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<button type="button" className={`flex w-full items-center rounded-xl text-left transition-colors hover:bg-[#f1f6f3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3c6355] ${open ? "gap-3 p-2" : "justify-center p-1"}`} />}
              aria-label={`Open account menu for ${businessName}`}
              title={open ? undefined : businessName}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#eaf0ed] text-xs font-semibold text-[#3c6355]" aria-hidden="true">{getBusinessInitials(businessName)}</span>
              {open && <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{businessName}</strong><small className="block text-xs text-slate-500">Service provider</small></span>}
              {open && <ChevronDown className="size-4 shrink-0 text-slate-500" aria-hidden="true" />}
            </DropdownMenuTrigger>
            <DropdownMenuContent aria-label="Provider account menu">
              <p className="truncate px-3 py-2 text-sm font-semibold">{businessName}</p>
              <DropdownMenuSeparator className="my-1 h-px bg-slate-100" />
              <DropdownMenuLinkItem render={<Link href="/" />}>
                <Home className="size-4 text-[#3c6355]" aria-hidden="true" />
                Aspen homepage
              </DropdownMenuLinkItem>
              <DropdownMenuItem onClick={onSignOut} label="Sign out" className="text-[#8d5d4c] data-highlighted:bg-[#fff4ef]">
                <LogOut className="size-4" aria-hidden="true" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarContent>
    </Sidebar>
    </>
  );
}
