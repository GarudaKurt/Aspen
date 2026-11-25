import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarGridSkeleton,
  LoadingRegion,
  SkeletonFields,
  SkeletonHeading,
  SkeletonLines,
} from "./skeletons";

export function DashboardContentSkeleton({
  kind = "overview",
}: {
  kind?: "overview" | "profile" | "services" | "appointments" | "calendar";
}) {
  return (
    <LoadingRegion label={`Loading ${kind}`}>
      {(kind === "services" || kind === "appointments") && (
        <Skeleton className="mb-2 h-4 w-40" />
      )}
      <SkeletonHeading />
      {kind === "calendar" ? (
        <div className="mt-6 space-y-5">
          <Skeleton className="h-10 w-full max-w-xl" />
          <CalendarGridSkeleton />
        </div>
      ) : kind === "profile" ? (
        <>
          <div className="mt-7 space-y-5 rounded-xl border p-6">
            <Skeleton className="h-6 w-48" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
              ))}
            </div>
          </div>
          <div className="mt-7 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <div className="space-y-6 rounded-xl border p-6">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <SkeletonFields />
            </div>
            <div className="space-y-5 rounded-xl border p-6">
              <Skeleton className="mx-auto size-24 rounded-2xl" />
              <SkeletonLines />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </>
      ) : (
        <>
          <div
            className={`mt-7 grid gap-4 ${kind === "services" ? "sm:grid-cols-2 xl:grid-cols-4" : kind === "appointments" ? "sm:grid-cols-2 xl:grid-cols-5" : "sm:grid-cols-3"}`}
          >
            {Array.from(
              {
                length:
                  kind === "services" ? 4 : kind === "appointments" ? 5 : 3,
              },
              (_, i) => (
                <div key={i} className="min-w-0 rounded-xl border p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-full max-w-32" />
                      <Skeleton className="h-9 w-12 max-w-full" />
                    </div>
                    <Skeleton className="size-11 shrink-0 rounded-2xl" />
                  </div>
                  {kind === "services" && (
                    <Skeleton className="mt-2 h-3 w-32 max-w-full" />
                  )}
                </div>
              ),
            )}
          </div>
          <div className="mt-7 space-y-5">
            <Skeleton className="h-10 w-full max-w-md" />
            {kind === "services" ? (
              <div className="divide-y overflow-hidden rounded-xl border">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(250px,.8fr)_auto] lg:items-center"
                  >
                    <div className="flex min-w-0 gap-4">
                      <Skeleton className="size-28 shrink-0 rounded-xl" />
                      <div className="min-w-0 flex-1 space-y-4">
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <SkeletonLines />
                        <Skeleton className="h-5 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-28 w-full rounded-xl" />
                    <div className="flex gap-2 lg:flex-col">
                      {[0, 1, 2, 3].map((j) => (
                        <Skeleton
                          key={j}
                          className="h-9 min-w-0 flex-1 lg:w-24 lg:flex-none"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border">
                <div className="flex gap-8 border-b p-4">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-4 w-1/3" />
                  ))}
                </div>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 border-b p-4 last:border-0"
                  >
                    <Skeleton className="size-10 shrink-0 rounded-full" />
                    <div className="flex-1">
                      <SkeletonLines rows={2} />
                    </div>
                    <Skeleton className="h-7 w-20 rounded-full" />
                    <Skeleton className="hidden h-8 w-24 sm:block" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </LoadingRegion>
  );
}
export function DashboardShellSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="flex h-16 items-center gap-3 border-b px-4 lg:hidden">
        <Skeleton className="size-10" />
        <Skeleton className="h-7 w-24" />
      </div>
      <div className="mx-auto flex max-w-[1440px] 2xl:max-w-[1920px]">
        <aside
          aria-hidden="true"
          className="hidden h-screen w-64 shrink-0 space-y-7 border-r p-5 lg:block 2xl:w-72"
        >
          <Skeleton className="h-9 w-32" />
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </aside>
        <main className="min-w-0 flex-1 p-5 sm:p-8 xl:p-10 2xl:p-14">
          <DashboardContentSkeleton />
        </main>
      </div>
    </div>
  );
}
export function AdminApplicationsSkeleton() {
  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-10 sm:px-8">
      <LoadingRegion
        label="Loading provider applications"
        className="mx-auto max-w-6xl"
      >
        <SkeletonHeading />
        <div className="mt-8 space-y-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-6 rounded-2xl border bg-white p-6">
              <Skeleton className="h-7 w-56 max-w-full" />
              <SkeletonLines />
              <div className="grid gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((j) => (
                  <Skeleton key={j} className="h-16 w-full" />
                ))}
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </LoadingRegion>
    </main>
  );
}
