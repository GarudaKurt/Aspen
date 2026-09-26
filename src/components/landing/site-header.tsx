"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  Heart,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Store,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useFavoritesStore } from "@/features/favorites";

const navigation = [
  { label: "Home", href: "/" },
  { label: "Browse", href: "/#browse" },
  { label: "Featured", href: "/featured" },
  { label: "How it works", href: "/how-it-works" },
];

const accountLinks = [
  {
    label: "My appointments",
    href: "/request-appointment",
    icon: CalendarDays,
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
  return pathname === href || pathname.startsWith(`${href}/`);
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
        <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center gap-4 px-4 sm:px-8 lg:px-12 xl:px-[130px]">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-md text-lg font-bold tracking-tight text-[#111111] outline-none transition-colors hover:text-[#3c6355] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40 sm:text-xl"
            onClick={closeMenus}
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-[#3c6355] text-sm font-bold text-white">
              A
            </span>
            Aspen
          </Link>

          <nav
            aria-label="Primary navigation"
            className="mx-auto hidden items-center gap-5 md:flex lg:gap-8"
          >
            {navigation.map((item) => {
              const active = isActiveRoute(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative rounded-md px-1 py-2 text-sm font-semibold outline-none transition-colors hover:text-[#3c6355] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40 lg:text-base ${active ? "text-[#3c6355] after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:bg-[#c5714e]" : "text-[#111111]"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link
              href="/list-your-business"
              className="hidden rounded-md px-2 py-2 text-sm font-semibold text-[#3c6355] outline-none transition-colors hover:text-[#c5714e] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40 lg:inline-flex"
            >
              List your business
            </Link>

            <Link
              href="/#browse"
              aria-label={`Saved businesses${savedCount ? ` (${savedCount})` : ""}`}
              className="relative hidden size-9 items-center justify-center rounded-lg text-[#3c6355] outline-none transition-colors hover:bg-[#eaf0ed] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40 sm:inline-flex"
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
                        {item.label}
                      </Link>
                    );
                  })}
                  <div className="mt-1 border-t border-[#ececea] px-3 py-2 text-xs text-[#8d918f]">
                    Saved businesses: {savedCount}
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
          title="Aspen navigation"
          onClose={() => setMobileOpen(false)}
          className="max-w-sm"
        >
          <div className="flex flex-1 flex-col p-4">
            <nav aria-label="Mobile navigation" className="space-y-1">
              {navigation.map((item) => {
                const active = isActiveRoute(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={closeMenus}
                    className={`flex min-h-11 items-center rounded-lg px-3 text-base font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#3c6355]/40 ${active ? "bg-[#eaf0ed] text-[#3c6355]" : "text-[#242524] hover:bg-[#f5f7f5]"}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="my-4 border-t border-[#ececea]" />

            <div className="space-y-1">
              <Link
                href="/#browse"
                onClick={closeMenus}
                className="flex min-h-11 items-center justify-between rounded-lg px-3 text-base font-semibold text-[#242524] outline-none transition-colors hover:bg-[#f5f7f5] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
              >
                <span className="flex items-center gap-3">
                  <Heart size={18} className="text-[#3c6355]" aria-hidden="true" />
                  Saved businesses
                </span>
                {savedCount > 0 && (
                  <span className="rounded-full bg-[#eaf0ed] px-2 py-0.5 text-xs text-[#3c6355]">
                    {savedCount}
                  </span>
                )}
              </Link>
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
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="mt-auto rounded-xl bg-[#eaf0ed] p-4">
              <p className="text-sm font-semibold text-[#3c6355]">Juan Dela Cruz</p>
              <p className="mt-1 text-xs text-[#587267]">
                Signed in to your customer account
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
