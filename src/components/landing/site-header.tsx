"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { useState } from "react";

import { AspenLogo } from "@/components/brand/aspen-logo";
import { AuthDialog } from "@/features/auth/components/auth-dialog";
import { CreateAccountDialog } from "@/features/auth/components/create-account-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";

type SiteHeaderProps = {
  /**
   * Authentication is intentionally opt-in until the app's auth provider is wired
   * into the public shell.
   */
  isSignedIn?: boolean;
  hasBusiness?: boolean;
};

const signedInLinks = [
  {
    label: "My appointments",
    href: "/request-appointment",
    icon: CalendarDays,
  },
  { label: "Messages", href: "/tenant-dashboard/chat", icon: MessageCircle },
  {
    label: "Notifications",
    href: "/tenant-dashboard/notifications",
    icon: Bell,
  },
];

function SearchAction({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/#browse"
      onClick={onClick}
      className="group flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-[#d8d8d8] bg-white px-3 text-sm text-[#6f7773] outline-none transition-colors hover:border-[#3c6355] hover:text-[#3c6355] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40 sm:max-w-[360px] sm:px-4"
      aria-label="Find pet services and businesses"
    >
      <Search
        size={17}
        aria-hidden="true"
        className="shrink-0 text-[#3c6355]"
      />
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

function MobileFavoritesAction({
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
      className="order-1 flex min-h-11 items-center gap-3 rounded-lg px-3 text-base font-semibold text-[#242524] outline-none transition-colors hover:bg-[#f5f7f5] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
    >
      <Heart size={18} className="text-[#3c6355]" aria-hidden="true" />
      Wishlist
      {favoriteCount > 0 && (
        <span className="ml-auto flex min-w-5 items-center justify-center rounded-full bg-[#eaf0ed] px-1.5 text-xs font-bold text-[#3c6355]">
          {favoriteCount}
        </span>
      )}
    </Link>
  );
}

function ListBusinessAction({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/subscriptions"
      onClick={onClick}
      className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-[#3c6355] outline-none transition-colors hover:bg-[#eaf0ed] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40 md:inline-flex"
    >
      <Store size={17} aria-hidden="true" />
      <span className="hidden lg:inline">Get Listed</span>
    </Link>
  );
}

export function SiteHeader({
  isSignedIn = false,
  hasBusiness = false,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const favoriteCount = 0;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  const closeMenus = () => {
    setMobileOpen(false);
    setAccountOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#d8d8d8] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center gap-2 px-4 sm:gap-4 sm:px-8 lg:px-12 xl:px-[70px]">
          <Link
            href="/"
            onClick={closeMenus}
            className="flex shrink-0 items-center gap-2 rounded-md text-lg font-bold tracking-tight text-[#111111] outline-none transition-colors hover:text-[#3c6355] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40 sm:text-xl"
          >
            <AspenLogo size={40} decorative className="size-9 sm:size-10" />
            <span>Aspen</span>
          </Link>

          {isHomePage ? (
            <div className="hidden flex-1 md:block" aria-hidden="true" />
          ) : (
            <div className="mx-auto hidden min-w-0 flex-1 justify-center md:flex">
              <SearchAction />
            </div>
          )}

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-1 sm:gap-2 md:ml-6 lg:ml-10">
              <div className="hidden sm:block">
                <FavoritesAction favoriteCount={favoriteCount} />
              </div>

              <ListBusinessAction />

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
                        className={
                          accountOpen
                            ? "rotate-180 transition-transform"
                            : "transition-transform"
                        }
                      />
                    </Button>

                    {accountOpen && (
                      <div
                        role="menu"
                        aria-label="Account menu"
                        className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-[#e0e0dd] bg-white p-2 shadow-lg"
                      >
                        <div className="border-b border-[#ececea] px-3 py-2">
                          <p className="text-sm font-semibold text-[#111111]">
                            Juan Dela Cruz
                          </p>
                          <p className="text-xs text-[#8d918f]">
                            Customer account
                          </p>
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
                              <Icon
                                size={16}
                                className="text-[#3c6355]"
                                aria-hidden="true"
                              />
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
                            <LayoutDashboard
                              size={16}
                              className="text-[#3c6355]"
                              aria-hidden="true"
                            />
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
                  <button
                    type="button"
                    onClick={() => setSignInOpen(true)}
                    className="rounded-full px-3 py-2 text-sm font-semibold text-[#3c6355] outline-none transition-colors hover:bg-[#eaf0ed] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateAccountOpen(true)}
                    className="rounded-full bg-[#3c6355] px-4 py-2 text-sm font-semibold text-white outline-none transition-colors hover:bg-[#315447] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
                  >
                    Create account
                  </button>
                </div>
              )}
            </div>

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
          title={
            <span className="flex items-center gap-2">
              <AspenLogo size={32} decorative className="size-8" />
              <span>Aspen</span>
            </span>
          }
          onClose={() => setMobileOpen(false)}
          className="max-w-sm"
        >
          <div className="flex flex-1 flex-col p-4">
            <div className="my-4 border-t border-[#ececea]" />

            <nav aria-label="Mobile customer navigation" className="flex flex-col space-y-1">
              <MobileFavoritesAction
                favoriteCount={favoriteCount}
                onClick={closeMenus}
              />

              <Link
                href="/subscriptions"
                onClick={closeMenus}
                className="order-2 flex min-h-11 items-center gap-3 rounded-lg px-3 text-base font-semibold text-[#3c6355] outline-none transition-colors hover:bg-[#f5f7f5] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
              >
                <Store size={18} aria-hidden="true" />
                Get Listed
              </Link>

              {isSignedIn ? (
                <div className="order-3 space-y-1">
                  {signedInLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenus}
                      className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-base font-semibold text-[#242524] outline-none transition-colors hover:bg-[#f5f7f5] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
                    >
                      <Icon
                        size={18}
                        className="text-[#3c6355]"
                        aria-hidden="true"
                      />
                      {item.label}
                    </Link>
                  );
                  })}
                </div>
              ) : (
                <div className="order-3 space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      closeMenus();
                      setSignInOpen(true);
                    }}
                    className="flex min-h-11 items-center gap-3 rounded-lg border border-[#d8d8d8] px-3 text-base font-semibold text-[#3c6355] outline-none transition-colors hover:bg-[#f5f7f5] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
                  >
                    <UserRound size={18} aria-hidden="true" />
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeMenus();
                      setCreateAccountOpen(true);
                    }}
                    className="flex min-h-11 items-center justify-center rounded-lg bg-[#3c6355] px-3 text-base font-semibold text-white outline-none transition-colors hover:bg-[#315447] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
                  >
                    Create account
                  </button>
                </div>
              )}
            </nav>


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

      <AuthDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        initialMode="login"
      />
      <CreateAccountDialog
        open={createAccountOpen}
        onOpenChange={setCreateAccountOpen}
      />
    </>
  );
}
