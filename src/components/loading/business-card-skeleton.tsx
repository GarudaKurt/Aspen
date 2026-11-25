import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function BusinessCardSkeleton() {
  return (
    <Card
      aria-label="Loading business card"
      aria-busy="true"
      className="min-w-0 overflow-hidden rounded-xl border border-[#e0e0dd] bg-white shadow-[0_2px_5px_rgba(20,20,20,0.15)]"
    >
      <Skeleton className="aspect-[1.35] w-full rounded-none" />
      <div className="space-y-2 p-2 sm:space-y-2.5 sm:p-2">
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-5 w-4/5" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-3 rounded-full" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-5 w-2/5" />
      </div>
    </Card>
  );
}
