import { LandingPage } from "@/components/landing/landing-page";
import { getPublishedBusinessCards } from "@/features/tenancy/api/public-catalog";
import { Suspense } from "react";
import { LandingSkeleton } from "@/components/loading/public-skeletons";
export const revalidate = 0;
export default function Home() {
  return <Suspense fallback={<LandingSkeleton />}><BusinessListings /></Suspense>;
}
async function BusinessListings() {
  const result = await getPublishedBusinessCards().then(
    (businesses) => ({ businesses, error: undefined }),
    () => ({ businesses: [], error: "Businesses could not be loaded. Please refresh the page to try again." }),
  );
  return <LandingPage {...result} />;
}
