"use client";

import type { ComponentProps } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";

export function Pagination({
  className,
  ...props
}: ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

export function PaginationContent({
  className,
  ...props
}: ComponentProps<"ul">) {
  return (
    <ul
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  );
}

export function PaginationItem(props: ComponentProps<"li">) {
  return <li {...props} />;
}

type PaginationLinkProps = ComponentProps<"button"> & {
  isActive?: boolean;
};

export function PaginationLink({
  className,
  isActive = false,
  ...props
}: PaginationLinkProps) {
  return (
    <button
      type="button"
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md border text-sm transition-colors hover:bg-[#e8f5ef] hover:text-[#3c6355] disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "border-[#3c6355] bg-[#e8f5ef] font-semibold text-[#3c6355]"
          : "border-transparent text-slate-600",
        className,
      )}
      {...props}
    />
  );
}

export function PaginationPrevious({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2 text-sm text-slate-600 transition-colors hover:bg-[#e8f5ef] hover:text-[#3c6355] disabled:pointer-events-none disabled:opacity-50 sm:px-3",
        className,
      )}
      {...props}
    >
      <ChevronLeft className="size-4" />
      <span className="hidden sm:inline">Previous</span>
    </button>
  );
}

export function PaginationNext({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2 text-sm text-slate-600 transition-colors hover:bg-[#e8f5ef] hover:text-[#3c6355] disabled:pointer-events-none disabled:opacity-50 sm:px-3",
        className,
      )}
      {...props}
    >
      <span className="hidden sm:inline">Next</span>
      <ChevronRight className="size-4" />
    </button>
  );
}
