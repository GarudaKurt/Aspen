import { LandingPage } from "@/components/landing/landing-page";
import { getPublishedBusinessCards } from "@/features/tenancy/api/queries";
import { Suspense } from "react";
import { BusinessListLoading } from "@/components/landing/business-list-loading";
export const dynamic = "force-dynamic";
export default function Home() {
  return <Suspense fallback={<BusinessListLoading />}><BusinessListings /></Suspense>;
}
async function BusinessListings() {
  const result = await getPublishedBusinessCards().then(
    (businesses) => ({ businesses, error: undefined }),
    () => ({ businesses: [], error: "Businesses could not be loaded. Please refresh the page to try again." }),
  );
  return <LandingPage {...result} />;
}
