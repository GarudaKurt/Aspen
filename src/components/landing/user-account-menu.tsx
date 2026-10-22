"use client";

import Link from "next/link";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Heart,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type HeaderUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  emailConfirmedAt: string | null;
};

type AccountLink = {
  label: string;
  href: string;
  icon: typeof UserRound;
};

const accountLinks: AccountLink[] = [
  { label: "My Profile", href: "/profile", icon: UserRound },
  { label: "My Bookings", href: "/bookings", icon: CalendarDays },
  { label: "My Wishlist", href: "/wishlist", icon: Heart },
];

const activityLinks: AccountLink[] = [
  { label: "Messages", href: "/chats", icon: MessageCircle },
  { label: "Notifications", href: "/notifications", icon: Bell },
];

export function getNameParts(name: string, email = "") {
  const source = name.trim() || email.split("@")[0] || "Aspen customer";
  const parts = source
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.trim())
    .filter(Boolean);
  const firstName = parts[0] || "Aspen";
  const lastName = parts.length > 1 ? parts[parts.length - 1] : "";

  return {
    firstName,
    lastName,
    fullName: [firstName, lastName].filter(Boolean).join(" "),
  };
}

function getInitials(name: string, email: string) {
  const { firstName, lastName } = getNameParts(name, email);
  return `${firstName[0] ?? "A"}${lastName[0] ?? (firstName[1] ?? "")}`.toUpperCase();
}

export function UserAvatar({
  user,
  size = "default",
}: {
  user: HeaderUser;
  size?: "small" | "default" | "large";
}) {
  const sizeClass =
    size === "small" ? "size-6 text-[10px]" : size === "large" ? "size-20 text-2xl" : "size-9 text-xs";

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#eaf0ed] font-semibold text-[#3c6355] ${sizeClass}`}
    >
      <span aria-hidden="true">{getInitials(user.displayName, user.email)}</span>
    </span>
  );
}

function AccountItemLabel({ item }: { item: AccountLink }) {
  const Icon = item.icon;
  return (
    <>
      <Icon size={16} className="text-[#3c6355]" aria-hidden="true" />
      <span>{item.label}</span>
    </>
  );
}

export function UserAccountMenu({
  user,
  favoriteCount,
  hasBusiness,
  onSignOut,
}: {
  user: HeaderUser;
  favoriteCount: number;
  hasBusiness: boolean;
  onSignOut: () => void;
}) {
  const { fullName } = getNameParts(user.displayName, user.email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            className="group relative size-11 rounded-full p-0 text-[#3c6355] hover:bg-[#eaf0ed] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40 focus-visible:ring-offset-2"
          />
        }
        aria-label={`Open account menu for ${fullName}`}
      >
        <span className="relative inline-flex rounded-full bg-[#3c6355] p-0.5 shadow-sm transition-transform duration-200 group-hover:scale-[1.04] group-active:scale-[0.98]">
          <UserAvatar user={user} />
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full border-2 border-white bg-[#3c6355] text-white shadow-sm"
          >
            <ChevronDown size={9} strokeWidth={2.5} />
          </span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent aria-label="Account menu">
        <div className="flex items-center gap-3 border-b border-[#ececea] px-3 pb-3 pt-1">
          <UserAvatar user={user} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#111111]">{fullName}</p>
            <p className="truncate text-xs text-[#8d918f]">{user.email}</p>
          </div>
        </div>
        <div className="pt-2">
          {accountLinks.map((item) => (
            <DropdownMenuLinkItem key={item.href} render={<Link href={item.href} />}>
              <AccountItemLabel item={item} />
            </DropdownMenuLinkItem>
          ))}
          {hasBusiness && (
            <DropdownMenuLinkItem render={<Link href="/tenant-dashboard" />}>
              <LayoutDashboard size={16} className="text-[#3c6355]" aria-hidden="true" />
              <span>Manage business</span>
            </DropdownMenuLinkItem>
          )}
        </div>
        <DropdownMenuSeparator className="my-2 h-px bg-[#ececea]" />
        <div>
          {activityLinks.map((item) => (
            <DropdownMenuLinkItem key={item.href} render={<Link href={item.href} />}>
              <AccountItemLabel item={item} />
            </DropdownMenuLinkItem>
          ))}
          <DropdownMenuLinkItem render={<Link href="/help" />}>
            <CircleHelp size={16} className="text-[#3c6355]" aria-hidden="true" />
            <span>Help &amp; Support</span>
          </DropdownMenuLinkItem>
        </div>
        <DropdownMenuSeparator className="my-2 h-px bg-[#ececea]" />
        <DropdownMenuItem onClick={onSignOut} label="Log out" className="text-[#8d5d4c] data-highlighted:bg-[#fff4ef]">
          <LogOut size={16} aria-hidden="true" />
          <span>Log out</span>
        </DropdownMenuItem>
        <p className="px-3 pb-1 pt-2 text-xs text-[#8d918f]">Saved businesses: {favoriteCount}</p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MobileAccountLinks({
  user,
  hasBusiness,
  onSignOut,
  onNavigate,
}: {
  user: HeaderUser;
  hasBusiness: boolean;
  onSignOut: () => void;
  onNavigate: () => void;
}) {
  return (
    <div className="space-y-1">
      <div className="mb-3 flex items-center gap-3 rounded-xl bg-[#eaf0ed] p-3">
        <UserAvatar user={user} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#315447]">
            {getNameParts(user.displayName, user.email).fullName}
          </p>
          <p className="truncate text-xs text-[#587267]">{user.email}</p>
        </div>
      </div>
      {accountLinks.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-base font-semibold text-[#242524] outline-none transition-colors hover:bg-[#f5f7f5] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
          >
            <Icon size={18} className="text-[#3c6355]" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
      <div className="my-2 border-t border-[#ececea]" />
      {activityLinks.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-base font-semibold text-[#242524] outline-none transition-colors hover:bg-[#f5f7f5] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
          >
            <Icon size={18} className="text-[#3c6355]" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
      <Link
        href="/help"
        onClick={onNavigate}
        className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-base font-semibold text-[#242524] outline-none transition-colors hover:bg-[#f5f7f5] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
      >
        <CircleHelp size={18} className="text-[#3c6355]" aria-hidden="true" />
        Help &amp; Support
      </Link>
      {hasBusiness && (
        <Link
          href="/tenant-dashboard"
          onClick={onNavigate}
          className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-base font-semibold text-[#3c6355] outline-none transition-colors hover:bg-[#f5f7f5] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
        >
          <LayoutDashboard size={18} aria-hidden="true" />
          Manage business
        </Link>
      )}
      <button
        type="button"
        onClick={onSignOut}
        className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-base font-semibold text-[#8d5d4c] outline-none transition-colors hover:bg-[#fff4ef] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
      >
        <LogOut size={18} aria-hidden="true" />
        Log out
      </button>
    </div>
  );
}
