"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  Heart,
  House,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Search,
  Store,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useFavoritesStore } from "@/features/favorites";

const primaryNavigation = [
  { label: "Home", href: "/", icon: House },
  { label: "Services", href: "/#browse", icon: Search },
  { label: "Appointments", href: "/request-appointment", icon: CalendarDays },
  { label: "Messages", href: "/tenant-dashboard/chat", icon: MessageCircle },
  { label: "Saved", href: "/#browse", icon: Heart },
];

const accountLinks = [
  {
    label: "My appointments",
    href: "/request-appointment",
    icon: CalendarDays,
  },
  {
    label: "Saved businesses",
    href: "/#browse",
    icon: Heart,
  },
  {
    label: "Messages",
    href: "/tenant-dashboard/chat",
    icon: MessageCircle,
  },
  {
    label: "Business dashboard",
    href: "/tenant-dashboard",
    icon: LayoutDashboard,
  },
];

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/#browse") return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLink({
  item,
  pathname,
  onClick,
  compact = false,
}: {
  item: (typeof primaryNavigation)[number];
  pathname: string;
  onClick?: () => void;
  compact?: boolean;
}) {
  const Icon = item.icon;
  const active = isActiveRoute(pathname, item.href);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={`relative flex items-center gap-2 rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#3c6355]/40 ${compact ? "min-h-10 px-3 text-sm" : "min-h-11 px-3 text-base"} ${active ? "bg-[#eaf0ed] font-semibold text-[#3c6355]" : "text-[#242524] hover:bg-[#f5f7f5] hover:text-[#3c6355]"}`}
    >
      <Icon size={compact ? 16 : 18} aria-hidden="true" />
      {item.label}
      {item.label === "Saved" && (
        <span className="ml-auto rounded-full bg-[#eaf0ed] px-1.5 py-0.5 text-xs text-[#3c6355]">
          saved
        </span>
      )}
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const favoriteCount = useFavoritesStore((state) => state.favoriteIds.length);
  const [hydrated, setHydrated] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const savedCount = hydrated ? favoriteCount : 0;

  const closeMenus = () => {
    setMobileOpen(false);
    setAccountOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#d8d8d8] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center gap-3 px-4 sm:px-8 lg:px-12 xl:px-[130px]">
          <Link
            href="/"
            onClick={closeMenus}
            className="flex shrink-0 items-center gap-2 rounded-md text-lg font-bold tracking-tight text-[#111111] outline-none transition-colors hover:text-[#3c6355] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40 sm:text-xl"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-[#3c6355] text-sm font-bold text-white">
              A
            </span>
            Aspen
          </Link>

          <Link
            href="/#browse"
            className="ml-3 hidden min-h-10 items-center gap-2 rounded-full border border-[#d8d8d8] bg-[#fafcfb] px-4 text-sm text-[#587267] outline-none transition-colors hover:border-[#3c6355] hover:bg-[#eaf0ed] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40 lg:flex xl:min-w-52"
          >
            <Search size={16} aria-hidden="true" />
            <span>Find pet care near you</span>
          </Link>

          <nav
            aria-label="Primary navigation"
            className="mx-auto hidden items-center gap-1 lg:flex"
          >
            {primaryNavigation.map((item) => {
              const Icon = item.icon;
              const active = isActiveRoute(pathname, item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold outline-none transition-colors hover:bg-[#f5f7f5] hover:text-[#3c6355] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40 ${active ? "text-[#3c6355] after:absolute after:inset-x-3 after:-bottom-2 after:h-0.5 after:bg-[#c5714e]" : "text-[#242524]"}`}
                >
                  <Icon size={16} aria-hidden="true" />
                  {item.label === "Saved" ? (
                    <>
                      <span>Saved</span>
                      {savedCount > 0 && (
                        <span className="rounded-full bg-[#eaf0ed] px-1.5 py-0.5 text-xs text-[#3c6355]">
                          {savedCount}
                        </span>
                      )}
                    </>
                  ) : (
                    item.label
                  )}
                </Link>
              );
            })}
          </nav>

          <nav
            aria-label="Tablet navigation"
            className="ml-auto hidden items-center gap-1 md:flex lg:hidden"
          >
            {primaryNavigation.slice(1, 3).map((item) => (
              <NavigationLink
                key={item.label}
                item={item}
                pathname={pathname}
                compact
              />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-3 sm:gap-3">
            <Link
              href="/list-your-business"
              className="hidden rounded-md px-2 py-2 text-sm font-semibold text-[#3c6355] outline-none transition-colors hover:text-[#c5714e] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40 xl:inline-flex"
            >
              List your business
            </Link>

            <Link
              href="/#browse"
              aria-label={`Saved businesses${savedCount ? ` (${savedCount})` : ""}`}
              className="relative hidden size-9 items-center justify-center rounded-lg text-[#3c6355] outline-none transition-colors hover:bg-[#eaf0ed] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40 sm:inline-flex lg:hidden"
            >
              <Heart size={18} aria-hidden="true" />
              {savedCount > 0 && (
                <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-[#c5714e] px-1 text-[10px] font-bold leading-4 text-white">
                  {savedCount}
                </span>
              )}
            </Link>

            <div className="relative hidden sm:block">
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                onClick={() => setAccountOpen((open) => !open)}
                className="gap-2 border-[#d8d8d8] text-[#3c6355]"
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-[#eaf0ed] text-xs font-semibold text-[#3c6355]">
                  JD
                </span>
                <span className="hidden md:inline">Account</span>
                <ChevronDown
                  size={14}
                  aria-hidden="true"
                  className={accountOpen ? "rotate-180 transition-transform" : "transition-transform"}
                />
              </Button>

              {accountOpen && (
                <div
                  role="menu"
                  aria-label="Account menu"
                  className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-[#e0e0dd] bg-white p-2 shadow-lg"
                >
                  <div className="border-b border-[#ececea] px-3 py-2">
                    <p className="text-sm font-semibold text-[#111111]">Juan Dela Cruz</p>
                    <p className="text-xs text-[#8d918f]">Customer account</p>
                  </div>
                  {accountLinks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        onClick={closeMenus}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#242524] outline-none transition-colors hover:bg-[#eaf0ed] focus-visible:bg-[#eaf0ed]"
                      >
                        <Icon size={16} className="text-[#3c6355]" aria-hidden="true" />
                        <span>{item.label}</span>
                        {item.label === "Saved businesses" && savedCount > 0 && (
                          <span className="ml-auto rounded-full bg-[#eaf0ed] px-1.5 py-0.5 text-xs text-[#3c6355]">
                            {savedCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                  <div className="mt-1 border-t border-[#ececea] px-3 py-2 text-xs text-[#8d918f]">
                    Profile and settings will be available here.
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              className="size-9 border-[#d8d8d8] p-0 text-[#3c6355] sm:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={18} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          title="Find pet care"
          onClose={() => setMobileOpen(false)}
          className="max-w-sm"
        >
          <div className="flex flex-1 flex-col p-4">
            <Link
              href="/#browse"
              onClick={closeMenus}
              className="mb-5 flex items-center gap-3 rounded-xl bg-[#eaf0ed] p-4 outline-none transition-colors hover:bg-[#dfeae5] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-[#3c6355] text-white">
                <Search size={19} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-[#3c6355]">
                  Find pet care
                </span>
                <span className="block text-xs text-[#587267]">
                  Search services and nearby businesses
                </span>
              </span>
            </Link>

            <nav aria-label="Mobile navigation" className="space-y-1">
              {primaryNavigation.map((item) => (
                <NavigationLink
                  key={item.label}
                  item={item}
                  pathname={pathname}
                  onClick={closeMenus}
                />
              ))}
            </nav>

            <div className="my-4 border-t border-[#ececea]" />

            <div className="space-y-1">
              <Link
                href="/list-your-business"
                onClick={closeMenus}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-base font-semibold text-[#3c6355] outline-none transition-colors hover:bg-[#f5f7f5] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
              >
                <Store size={18} aria-hidden="true" />
                List your business
              </Link>
              {accountLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenus}
                    className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-base text-[#242524] outline-none transition-colors hover:bg-[#f5f7f5] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
                  >
                    <Icon size={18} className="text-[#3c6355]" aria-hidden="true" />
                    <span>{item.label}</span>
                    {item.label === "Saved businesses" && savedCount > 0 && (
                      <span className="ml-auto rounded-full bg-[#eaf0ed] px-1.5 py-0.5 text-xs text-[#3c6355]">
                        {savedCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="mt-auto rounded-xl bg-[#eaf0ed] p-4">
              <p className="text-sm font-semibold text-[#3c6355]">Juan Dela Cruz</p>
              <p className="mt-1 text-xs text-[#587267]">
                Customer account
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
