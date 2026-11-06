import { Skeleton } from "@/components/ui/skeleton";
export default function BusinessLoading() {
  return <main role="status" aria-label="Loading business profile" className="mx-auto max-w-6xl space-y-6 p-6">
    <Skeleton className="h-56 w-full rounded-2xl" /><Skeleton className="h-8 w-2/3" /><Skeleton className="h-40 w-full" />
  </main>;
}
