import type { ReactNode } from "react";
import { cn } from "cn";
import { Skeleton } from "@/components/ui/skeleton";

/** One announcement per loading region; decorative bars are not focusable. */
export function LoadingRegion({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-live="polite"
      aria-busy="true"
      className={className}
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}
export function SkeletonLines({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton
          key={index}
          className={`h-4 ${index === rows - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}
export function SkeletonHeading() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-64 max-w-full sm:h-10" />
      <Skeleton className="h-4 w-full max-w-lg" />
    </div>
  );
}
export function SkeletonFields({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-5">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
export function PublicHeaderSkeleton() {
  return (
    <div aria-hidden="true" className="border-b bg-white">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-4 sm:px-8 lg:px-12 xl:px-[70px]">
        <Skeleton className="h-10 w-28" />
        <div className="flex items-center gap-6">
          <Skeleton className="hidden h-5 w-24 sm:block" />
          <Skeleton className="hidden h-5 w-28 sm:block" />
          <Skeleton className="size-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}
export function PublicSkeletonPage({
  label,
  children,
  className = "max-w-[1180px]",
  background = "bg-[#fafcfb]",
}: {
  label: string;
  children: ReactNode;
  className?: string;
  background?: string;
}) {
  return (
    <>
      <PublicHeaderSkeleton />
      <main className={`min-h-screen ${background}`}>
        <LoadingRegion
          label={label}
          className={cn(
            "mx-auto w-full px-4 py-8 sm:px-8 sm:py-12 lg:px-12",
            className,
          )}
        >
          {children}
        </LoadingRegion>
      </main>
    </>
  );
}
export function BusinessProfileSkeleton() {
  return (
    <>
      <PublicHeaderSkeleton />
      <main className="min-h-screen bg-white px-4 py-6 sm:px-8 sm:py-10 lg:px-12">
        <LoadingRegion
          label="Loading business profile"
          className="mx-auto max-w-[1120px]"
        >
          <div className="border-b pb-4">
            <Skeleton className="h-6 w-36" />
          </div>
          <div className="pt-6 sm:pt-8">
            <div className="grid h-[220px] gap-1.5 overflow-hidden rounded-2xl sm:h-[280px] sm:grid-cols-[2fr_1fr] sm:grid-rows-2 lg:h-[320px]">
              <Skeleton className="row-span-2 h-full rounded-none" />
              <Skeleton className="hidden h-full rounded-none sm:block" />
              <Skeleton className="hidden h-full rounded-none sm:block" />
            </div>
            <div className="mt-4 flex flex-col justify-between gap-4 sm:mt-5 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-full max-w-md" />
                <Skeleton className="h-4 w-full max-w-lg" />
              </div>
              <Skeleton className="h-9 w-44 rounded-full" />
            </div>
          </div>
          <div className="mt-14 grid rounded-2xl border sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2 px-4 py-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32 max-w-full" />
              </div>
            ))}
          </div>
          <div className="mt-8 flex gap-6 overflow-hidden border-b py-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-6 w-20 shrink-0" />
            ))}
          </div>
          <div className="grid gap-12 px-2 py-8 sm:px-4 lg:grid-cols-[1fr_260px] lg:gap-16">
            <div className="space-y-8">
              <SkeletonLines rows={4} />
              <Skeleton className="h-44 w-full rounded-xl" />
            </div>
            <div className="space-y-5 rounded-xl border p-5">
              <SkeletonLines />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </LoadingRegion>
      </main>
    </>
  );
}
export function AppointmentSkeleton({
  step = "service",
}: {
  step?: "service" | "date-time" | "pet" | "details" | "confirmation";
}) {
  if (step === "confirmation")
    return (
      <main className="min-h-screen bg-[#fafaf9] px-4 py-10 sm:px-8">
        <LoadingRegion
          label="Loading appointment confirmation"
          className="mx-auto max-w-[760px]"
        >
          <Skeleton className="h-5 w-20" />
          <div className="mt-6 space-y-6 rounded-xl border bg-white p-8 sm:p-12">
            <Skeleton className="mx-auto size-28 rounded-full" />
            <Skeleton className="mx-auto h-9 w-52" />
            <SkeletonLines rows={5} />
            <Skeleton className="mx-auto h-11 w-full max-w-md" />
          </div>
        </LoadingRegion>
      </main>
    );
  return (
    <main className="min-h-screen bg-white px-4 py-10 sm:px-8 sm:py-8 lg:px-12">
      <LoadingRegion
        label="Loading appointment"
        className="mx-auto max-w-[1040px]"
      >
        <div className="flex justify-between border-b pb-5">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-7 w-24" />
        </div>
        <div className="space-y-3 py-8 sm:py-10">
          <Skeleton className="h-3 w-36" />
          <SkeletonHeading />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="grid items-start gap-8 lg:grid-cols-[170px_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="flex gap-4 lg:block">
              <Skeleton className="size-20 shrink-0 rounded-xl lg:mb-4 lg:h-28 lg:w-full" />
              <div className="min-w-0 flex-1">
                <SkeletonLines />
              </div>
            </div>
            <div className="flex gap-4 lg:flex-col">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 flex-1 lg:w-full lg:flex-none" />
              ))}
            </div>
          </div>
          <div className="min-w-0 space-y-6 rounded-xl border bg-white p-6 sm:p-8">
            <SkeletonHeading />
            {step === "date-time" ? (
              <CalendarGridSkeleton compact />
            ) : step === "service" ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex gap-4 rounded-lg border p-4">
                    <Skeleton className="size-6 shrink-0" />
                    <div className="flex-1">
                      <SkeletonLines rows={2} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <SkeletonFields count={4} />
            )}
            <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:justify-between">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-11 w-full sm:w-40" />
              <Skeleton className="h-11 w-full sm:w-40" />
            </div>
          </div>
        </div>
      </LoadingRegion>
    </main>
  );
}
export function CustomerProfileSkeleton() {
  return (
    <PublicSkeletonPage
      label="Loading your profile"
      className="max-w-5xl lg:px-8"
    >
      <Skeleton className="mb-2 h-3 w-36" />
      <SkeletonHeading />
      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-5 rounded-xl border bg-white p-6">
          <Skeleton className="mx-auto size-20 rounded-full" />
          <Skeleton className="mx-auto h-6 w-40" />
          <Skeleton className="mx-auto h-4 w-48 max-w-full" />
          <Skeleton className="mx-auto h-8 w-32 rounded-full" />
        </div>
        <div className="space-y-5">
          <div className="space-y-5 rounded-xl border bg-white p-6">
            <SkeletonLines rows={2} />
            <SkeletonFields count={2} />
            <Skeleton className="h-10 w-36" />
          </div>
          <div className="space-y-5 rounded-xl border bg-white p-6">
            <SkeletonLines />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      </div>
    </PublicSkeletonPage>
  );
}
export function CalendarGridSkeleton({
  mode = "month",
  compact = false,
}: {
  mode?: "month" | "week" | "day" | "agenda";
  compact?: boolean;
}) {
  return (
    <LoadingRegion label="Loading calendar">
      {mode === "agenda" ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border p-5">
              <SkeletonLines rows={2} />
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <div
            className={`grid gap-px border-b bg-[#edf1ee] ${mode === "day" ? "grid-cols-1" : "grid-cols-7"}`}
          >
            {Array.from({ length: mode === "day" ? 1 : 7 }, (_, i) => (
              <div key={i} className="bg-white p-2">
                <Skeleton className="mx-auto h-4 w-8 max-w-full" />
              </div>
            ))}
          </div>
          <div
            className={`grid gap-px bg-[#edf1ee] ${mode === "day" ? "grid-cols-1" : "grid-cols-7"}`}
          >
            {Array.from(
              { length: mode === "month" ? 42 : mode === "day" ? 8 : 56 },
              (_, i) => (
                <div
                  key={i}
                  className={`min-w-0 space-y-3 bg-white p-2 ${compact ? "min-h-10" : mode === "month" ? "min-h-20 sm:min-h-28" : "min-h-12"}`}
                >
                  <Skeleton className="h-3 w-5 max-w-full" />
                  {!compact && i % 5 === 0 && (
                    <Skeleton className="h-5 w-full" />
                  )}
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </LoadingRegion>
  );
}
export function CustomerListSkeleton({
  kind,
}: {
  kind: "bookings" | "notifications";
}) {
  return (
    <PublicSkeletonPage label={`Loading ${kind}`}>
      <SkeletonHeading />
      <div className="mt-8 flex gap-3 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <div
        className={`mt-6 grid gap-4 ${kind === "bookings" ? "lg:grid-cols-2" : ""}`}
      >
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-5 rounded-2xl border bg-white p-5">
            <div className="flex justify-between gap-4">
              <Skeleton className="h-6 min-w-0 max-w-48 flex-1" />
              <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
            </div>
            <SkeletonLines rows={kind === "bookings" ? 3 : 2} />
            {kind === "bookings" && <Skeleton className="h-10 w-full" />}
          </div>
        ))}
      </div>
    </PublicSkeletonPage>
  );
}
