"use client";

import Link from "next/link";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  Heart,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Search,
  Store,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useFavoritesStore } from "@/features/favorites";

type SiteHeaderProps = {
  /**
   * Authentication is intentionally opt-in until the app's auth provider is wired
   * into the public shell.
   */
  isSignedIn?: boolean;
  hasBusiness?: boolean;
};

const signedInLinks = [
  { label: "My appointments", href: "/request-appointment", icon: CalendarDays },
  { label: "Messages", href: "/tenant-dashboard/chat", icon: MessageCircle },
  { label: "Notifications", href: "/tenant-dashboard/notifications", icon: Bell },
];

function SearchAction({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/#browse"
      onClick={onClick}
      className="group flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-[#d8d8d8] bg-white px-3 text-sm text-[#6f7773] outline-none transition-colors hover:border-[#3c6355] hover:text-[#3c6355] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40 sm:max-w-[360px] sm:px-4"
      aria-label="Find pet services and businesses"
    >
      <Search size={17} aria-hidden="true" className="shrink-0 text-[#3c6355]" />
      <span className="truncate group-hover:text-[#3c6355]">
        Find pet services or businesses
      </span>
    </Link>
  );
}

function FavoritesAction({
  favoriteCount,
  onClick,
}: {
  favoriteCount: number;
  onClick?: () => void;
}) {
  return (
    <Link
      href="/#browse"
      onClick={onClick}
      aria-label={`Saved businesses${favoriteCount ? ` (${favoriteCount})` : ""}`}
      className="relative inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-[#3c6355] outline-none transition-colors hover:bg-[#eaf0ed] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
    >
      <Heart size={18} aria-hidden="true" />
      <span className="hidden lg:inline">Wishlist</span>
      {favoriteCount > 0 && (
        <span className="flex min-w-5 items-center justify-center rounded-full bg-[#eaf0ed] px-1.5 text-xs font-bold text-[#3c6355]">
          {favoriteCount}
        </span>
      )}
    </Link>
  );
}

export function SiteHeader({
  isSignedIn = false,
  hasBusiness = false,
}: SiteHeaderProps) {
  const favoriteIds = useFavoritesStore((state) => state.favoriteIds);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    setFavoriteCount(favoriteIds.length);
  }, [favoriteIds.length]);

  const closeMenus = () => {
    setMobileOpen(false);
    setAccountOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#d8d8d8] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center gap-2 px-4 sm:gap-4 sm:px-8 lg:px-12 xl:px-[130px]">
          <Link
            href="/"
            onClick={closeMenus}
            className="flex shrink-0 items-center gap-2 rounded-md text-lg font-bold tracking-tight text-[#111111] outline-none transition-colors hover:text-[#3c6355] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40 sm:text-xl"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-[#3c6355] text-sm font-bold text-white">
              A
            </span>
            <span>Aspen</span>
          </Link>

          <div className="mx-auto hidden min-w-0 flex-1 justify-center md:flex">
            <SearchAction />
          </div>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Link
              href="/#browse"
              aria-label="Search pet services"
              className="inline-flex size-10 items-center justify-center rounded-full text-[#3c6355] outline-none transition-colors hover:bg-[#eaf0ed] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40 md:hidden"
            >
              <Search size={19} aria-hidden="true" />
            </Link>

            <div className="hidden sm:block">
              <FavoritesAction favoriteCount={favoriteCount} />
            </div>

            {isSignedIn ? (
              <>
                <div className="hidden items-center gap-1 md:flex">
                  {signedInLinks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-label={item.label}
                        className="relative inline-flex size-10 items-center justify-center rounded-full text-[#3c6355] outline-none transition-colors hover:bg-[#eaf0ed] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
                      >
                        <Icon size={18} aria-hidden="true" />
                      </Link>
                    );
                  })}
                </div>

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
                    <span className="hidden lg:inline">Account</span>
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
                      {signedInLinks.map((item) => {
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
                      {hasBusiness && (
                        <Link
                          href="/tenant-dashboard"
                          role="menuitem"
                          onClick={closeMenus}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#242524] outline-none transition-colors hover:bg-[#eaf0ed] focus-visible:bg-[#eaf0ed]"
                        >
                          <LayoutDashboard size={16} className="text-[#3c6355]" aria-hidden="true" />
                          Manage business
                        </Link>
                      )}
                      <div className="mt-1 border-t border-[#ececea] px-3 py-2 text-xs text-[#8d918f]">
                        Saved businesses: {favoriteCount}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden items-center gap-1 sm:flex">
                <Link
                  href="/?auth=sign-in"
                  className="rounded-full px-3 py-2 text-sm font-semibold text-[#3c6355] outline-none transition-colors hover:bg-[#eaf0ed] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
                >
                  Sign in
                </Link>
                <Link
                  href="/?auth=create-account"
                  className="rounded-full bg-[#3c6355] px-4 py-2 text-sm font-semibold text-white outline-none transition-colors hover:bg-[#315447] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
                >
                  Create account
                </Link>
              </div>
            )}

            <Button
              variant="outline"
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              className="size-10 border-[#d8d8d8] p-0 text-[#3c6355] sm:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={19} aria-hidden="true" />
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
            <SearchAction onClick={closeMenus} />

            <div className="my-4 border-t border-[#ececea]" />

            <nav aria-label="Mobile customer navigation" className="space-y-1">
              <FavoritesAction favoriteCount={favoriteCount} onClick={closeMenus} />

              {isSignedIn ? (
                signedInLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenus}
                      className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-base font-semibold text-[#242524] outline-none transition-colors hover:bg-[#f5f7f5] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
                    >
                      <Icon size={18} className="text-[#3c6355]" aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                })
              ) : (
                <div className="space-y-2 pt-2">
                  <Link
                    href="/?auth=sign-in"
                    onClick={closeMenus}
                    className="flex min-h-11 items-center gap-3 rounded-lg border border-[#d8d8d8] px-3 text-base font-semibold text-[#3c6355] outline-none transition-colors hover:bg-[#f5f7f5] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
                  >
                    <UserRound size={18} aria-hidden="true" />
                    Sign in
                  </Link>
                  <Link
                    href="/?auth=create-account"
                    onClick={closeMenus}
                    className="flex min-h-11 items-center justify-center rounded-lg bg-[#3c6355] px-3 text-base font-semibold text-white outline-none transition-colors hover:bg-[#315447] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
                  >
                    Create account
                  </Link>
                </div>
              )}
            </nav>

            <div className="my-4 border-t border-[#ececea]" />

            <Link
              href="/list-your-business"
              onClick={closeMenus}
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-base font-semibold text-[#3c6355] outline-none transition-colors hover:bg-[#f5f7f5] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
            >
              <Store size={18} aria-hidden="true" />
              List your business
            </Link>

            {isSignedIn && hasBusiness && (
              <Link
                href="/tenant-dashboard"
                onClick={closeMenus}
                className="mt-1 flex min-h-11 items-center gap-3 rounded-lg px-3 text-base font-semibold text-[#3c6355] outline-none transition-colors hover:bg-[#f5f7f5] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
              >
                <LayoutDashboard size={18} aria-hidden="true" />
                Manage business
              </Link>
            )}

            <div className="mt-auto rounded-xl bg-[#eaf0ed] p-4">
              <p className="text-sm font-semibold text-[#3c6355]">
                {isSignedIn ? "Juan Dela Cruz" : "New to Aspen?"}
              </p>
              <p className="mt-1 text-xs text-[#587267]">
                {isSignedIn
                  ? "Your appointments and messages are one tap away."
                  : "Find trusted pet services near you."}
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
