"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Heart,
  Menu,
  Search,
  Store,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import { AspenLogo } from "@/components/brand/aspen-logo";
import { AuthDialog } from "@/features/auth/components/auth-dialog";
import { CreateAccountDialog } from "@/features/auth/components/create-account-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useFavoritesStore } from "@/features/favorites/store/favorites.store";
import { clearListingDraft } from "@/features/business-profile/store/onboarding.store";

import {
  MobileAccountLinks,
  UserAccountMenu,
  type HeaderUser,
} from "./user-account-menu";

type SiteHeaderProps = {
  /** Kept for compatibility with existing callers; the browser session is authoritative. */
  isSignedIn?: boolean;
  hasBusiness?: boolean;
};

function toHeaderUser(user: {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
} | null): HeaderUser | null {
  if (!user || !user.email_confirmed_at) return null;

  const metadata = user.user_metadata ?? {};
  const email = user.email ?? "";
  const displayName =
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    (typeof metadata.display_name === "string" && metadata.display_name) ||
    email.split("@")[0] ||
    "Aspen customer";
  const avatarUrl =
    (typeof metadata.avatar_url === "string" && metadata.avatar_url) ||
    (typeof metadata.picture === "string" && metadata.picture) ||
    null;

  return {
    id: user.id,
    email,
    displayName,
    avatarUrl,
    emailConfirmedAt: user.email_confirmed_at,
  };
}

function SearchAction({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/#browse"
      onClick={onClick}
      className="group flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-[#d8d8d8] bg-white px-3 text-sm text-[#6f7773] outline-none transition-colors hover:border-[#3c6355] hover:text-[#3c6355] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40 sm:max-w-[360px] sm:px-4"
      aria-label="Find pet services and businesses"
    >
      <Search size={17} aria-hidden="true" className="shrink-0 text-[#3c6355]" />
      <span className="truncate group-hover:text-[#3c6355]">Find pet services or businesses</span>
    </Link>
  );
}

function FavoritesAction({ favoriteCount, onClick }: { favoriteCount: number; onClick?: () => void }) {
  return (
    <Link
      href="/wishlist"
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

export function SiteHeader({ hasBusiness = false }: SiteHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isHomePage = pathname === "/";
  const favoriteCount = useFavoritesStore((state) => state.favoriteSlugs.length);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);
  const [user, setUser] = useState<HeaderUser | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let active = true;

    void supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!active) return;
        setUser(toHeaderUser(data.user));
        setAuthResolved(true);
      })
      .catch(() => {
        if (active) setAuthResolved(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(toHeaderUser(session?.user ?? null));
      setAuthResolved(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const closeMenus = () => setMobileOpen(false);

  const signOut = async () => {
    await getSupabaseBrowserClient().auth.signOut();
    clearListingDraft();
    setUser(null);
    setMobileOpen(false);
    router.refresh();
  };

  const showSignedIn = authResolved && Boolean(user);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#d8d8d8] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center gap-2 px-4 sm:gap-4 sm:px-8 lg:px-12 xl:px-[70px] 2xl:max-w-none 2xl:gap-10 2xl:px-20">
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
            <div className="flex items-center gap-1 sm:gap-2 md:ml-6 lg:ml-10 2xl:ml-16 2xl:gap-3">
              <div className="hidden sm:block">
                <FavoritesAction favoriteCount={favoriteCount} />
              </div>
              <ListBusinessAction />

              {showSignedIn && user ? (
                <div className="hidden sm:block">
                  <UserAccountMenu
                    user={user}
                    favoriteCount={favoriteCount}
                    hasBusiness={hasBusiness}
                    onSignOut={() => void signOut()}
                  />
                </div>
              ) : authResolved ? (
                <div className="hidden items-center gap-1 sm:flex 2xl:gap-2">
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
                    className="rounded-full bg-[#3c6355] px-4 py-2 text-sm font-semibold text-white outline-none transition-colors hover:bg-[#315447] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40 2xl:px-5"
                  >
                    Create account
                  </button>
                </div>
              ) : (
                <div className="hidden h-9 w-24 animate-pulse rounded-full bg-[#eef3f0] sm:block" aria-label="Loading account" />
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
              <Link
                href="/wishlist"
                onClick={closeMenus}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-base font-semibold text-[#242524] outline-none transition-colors hover:bg-[#f5f7f5] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
              >
                <Heart size={18} className="text-[#3c6355]" aria-hidden="true" />
                Wishlist
                {favoriteCount > 0 && (
                  <span className="ml-auto rounded-full bg-[#eaf0ed] px-2 py-0.5 text-xs text-[#3c6355]">{favoriteCount}</span>
                )}
              </Link>
              <Link
                href="/subscriptions"
                onClick={closeMenus}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-base font-semibold text-[#3c6355] outline-none transition-colors hover:bg-[#f5f7f5] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
              >
                <Store size={18} aria-hidden="true" />
                Get Listed
              </Link>

              {showSignedIn && user ? (
                <MobileAccountLinks
                  user={user}
                  hasBusiness={hasBusiness}
                  onNavigate={closeMenus}
                  onSignOut={() => void signOut()}
                />
              ) : authResolved ? (
                <div className="flex flex-col items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { closeMenus(); setSignInOpen(true); }}
                    className="flex min-h-11 w-full max-w-xs items-center justify-center gap-3 rounded-lg border border-[#d8d8d8] px-3 text-base font-semibold text-[#3c6355] outline-none transition-colors hover:bg-[#f5f7f5] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
                  >
                    <UserRound size={18} aria-hidden="true" />
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => { closeMenus(); setCreateAccountOpen(true); }}
                    className="flex min-h-11 w-full max-w-xs items-center justify-center rounded-lg bg-[#3c6355] px-3 text-base font-semibold text-white outline-none transition-colors hover:bg-[#315447] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
                  >
                    Create account
                  </button>
                </div>
              ) : (
                <div className="mt-2 h-24 animate-pulse rounded-xl bg-[#eef3f0]" aria-label="Loading account" />
              )}
            </nav>

            <div className="mt-auto rounded-xl bg-[#eaf0ed] p-4">
              <p className="text-sm font-semibold text-[#3c6355]">
                {showSignedIn && user ? `Welcome, ${user.displayName}` : "New to Aspen?"}
              </p>
              <p className="mt-1 text-xs text-[#587267]">
                {showSignedIn ? "Your account and saved businesses are one tap away." : "Find trusted pet services near you."}
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AuthDialog open={signInOpen} onOpenChange={setSignInOpen} initialMode="login" />
      <CreateAccountDialog open={createAccountOpen} onOpenChange={setCreateAccountOpen} />
    </>
  );
}
