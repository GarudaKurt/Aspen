import { BusinessCardSkeleton } from "./business-card";
export function BusinessListLoading() {
  return <div role="status" aria-label="Loading businesses" className="mx-auto grid max-w-6xl gap-5 px-6 py-12 sm:grid-cols-2 lg:grid-cols-3">
    {[0, 1, 2, 3, 4, 5].map((id) => <BusinessCardSkeleton key={id} />)}
  </div>;
}
