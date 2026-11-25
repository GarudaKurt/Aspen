import { Skeleton } from "@/components/ui/skeleton";
import {
  LoadingRegion,
  PublicSkeletonPage,
  SkeletonHeading,
  SkeletonLines,
} from "./skeletons";

export function ConversationListSkeleton() {
  return (
    <LoadingRegion label="Loading conversations" className="space-y-5 p-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <SkeletonLines rows={2} />
          </div>
          <Skeleton className="h-3 w-8" />
        </div>
      ))}
    </LoadingRegion>
  );
}
export function MessageContentSkeleton() {
  return (
    <LoadingRegion
      label="Loading messages"
      className="min-h-0 flex-1 overflow-hidden p-4 sm:p-6"
    >
      <Skeleton className="mx-auto mb-6 h-3 w-24" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`mb-5 w-3/4 space-y-2 ${i % 2 ? "ml-auto" : ""}`}
        >
          <Skeleton className={`rounded-2xl ${i % 3 ? "h-16" : "h-12"}`} />
          <Skeleton className={`h-3 w-14 ${i % 2 ? "ml-auto" : ""}`} />
        </div>
      ))}
    </LoadingRegion>
  );
}
export function ConversationPanelSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-20 items-center gap-3 border-b px-5">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-5 w-40 max-w-full" />
      </div>
      <MessageContentSkeleton />
      <div className="border-t p-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="mt-2 h-3 w-48 max-w-full" />
      </div>
    </div>
  );
}
export function ChatPageSkeleton({ customer = false }: { customer?: boolean }) {
  const content = (
    <>
      <SkeletonHeading />
      <div className="mt-5 grid h-[min(740px,78dvh)] min-h-[420px] overflow-hidden rounded-2xl border bg-white md:grid-cols-[290px_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="min-h-0 overflow-hidden border-r">
          <div className="space-y-3 border-b p-4">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
          <ConversationListSkeleton />
        </div>
        <div className="hidden min-h-0 md:block">
          <ConversationPanelSkeleton />
        </div>
      </div>
    </>
  );
  return customer ? (
    <PublicSkeletonPage label="Loading chats" background="bg-[#fafaf9]">
      {content}
    </PublicSkeletonPage>
  ) : (
    <LoadingRegion label="Loading chats">{content}</LoadingRegion>
  );
}
