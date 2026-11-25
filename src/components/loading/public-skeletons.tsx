import { Skeleton } from "@/components/ui/skeleton";
import { BusinessCardSkeleton } from "./business-card-skeleton";
import {
  LoadingRegion,
  PublicHeaderSkeleton,
  PublicSkeletonPage,
  SkeletonFields,
  SkeletonHeading,
  SkeletonLines,
} from "./skeletons";

export function BusinessCardsSkeleton() {
  return (
    <div className="grid gap-5 min-[560px]:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <BusinessCardSkeleton key={i} />
      ))}
    </div>
  );
}
export function LandingSkeleton() {
  return (
    <>
      <PublicHeaderSkeleton />
      <main className="min-h-screen bg-white">
        <LoadingRegion label="Loading businesses">
          <div className="px-6 pb-12 pt-14 sm:px-10 sm:pb-16 sm:pt-16 lg:px-[130px]">
            <div className="mx-auto max-w-[1440px] space-y-5">
              <Skeleton className="h-24 w-full max-w-[1000px] sm:h-28 lg:h-32" />
              <Skeleton className="h-12 w-full max-w-[820px]" />
              <Skeleton className="h-36 w-full max-w-[680px] rounded-2xl sm:h-[62px]" />
              <div className="flex gap-3 overflow-hidden">
                {[0, 1, 2].map((i) => (
                  <Skeleton
                    key={i}
                    className="h-10 w-36 shrink-0 rounded-full"
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="mx-auto max-w-[1440px] space-y-7 px-6 pb-12 sm:px-10 lg:px-12">
            <SkeletonHeading />
            <BusinessCardsSkeleton />
          </div>
        </LoadingRegion>
      </main>
    </>
  );
}
export function WishlistSkeleton() {
  return (
    <PublicSkeletonPage
      label="Loading wishlist"
      background="bg-white"
      className="max-w-[1440px] xl:px-20"
    >
      <Skeleton className="mb-2 h-3 w-28" />
      <SkeletonHeading />
      <div className="mt-8">
        <BusinessCardsSkeleton />
      </div>
    </PublicSkeletonPage>
  );
}
export function ListingSkeleton() {
  return (
    <main className="min-h-screen bg-white px-4 py-10 sm:px-8 sm:py-8 lg:px-12">
      <LoadingRegion
        label="Loading business registration"
        className="mx-auto max-w-[1040px]"
      >
        <div className="flex justify-between border-b pb-5">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-7 w-24" />
        </div>
        <div className="py-10">
          <SkeletonHeading />
        </div>
        <div className="grid gap-8 lg:grid-cols-[150px_minmax(0,1fr)]">
          <div className="flex gap-3 lg:flex-col">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-9 flex-1 lg:w-full lg:flex-none" />
            ))}
          </div>
          <div className="min-w-0 space-y-6 rounded-xl border p-6 sm:p-8">
            <SkeletonHeading />
            <SkeletonFields count={4} />
            <Skeleton className="h-11 w-full sm:ml-auto sm:w-40" />
          </div>
        </div>
      </LoadingRegion>
    </main>
  );
}
export function HelpSkeleton() {
  return (
    <>
      <PublicHeaderSkeleton />
      <main className="min-h-screen bg-[#fafcfb]">
        <LoadingRegion label="Loading help center">
          <div className="space-y-5 bg-[#eef6f1] px-4 py-16">
            <Skeleton className="mx-auto h-10 w-64 max-w-full" />
            <Skeleton className="mx-auto h-12 w-full max-w-xl rounded-xl" />
          </div>
          <div className="mx-auto max-w-[1180px] space-y-6 px-4 py-12 sm:px-8 lg:px-12">
            <SkeletonHeading />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="space-y-4 rounded-2xl border bg-white p-5"
                >
                  <Skeleton className="size-8" />
                  <SkeletonLines rows={2} />
                </div>
              ))}
            </div>
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
        </LoadingRegion>
      </main>
    </>
  );
}
export function AuthSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-black/40 p-4">
      <LoadingRegion
        label="Loading account form"
        className="w-full max-w-[440px] rounded-2xl bg-white p-6 sm:p-8"
      >
        <Skeleton className="mx-auto mb-6 size-12 rounded-full" />
        <SkeletonFields count={fields} />
        <Skeleton className="mt-6 h-11 w-full" />
        <Skeleton className="mt-6 h-10 w-full" />
        <Skeleton className="mx-auto mt-5 h-4 w-48 max-w-full" />
      </LoadingRegion>
    </div>
  );
}
