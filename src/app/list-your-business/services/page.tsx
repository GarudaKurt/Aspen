import { ListingPage } from "@/components/listing/listing-page";
import { getMyProviderApplication } from "@/features/tenancy/api/queries";

export const dynamic = "force-dynamic";

export default async function ServicesListingPage() {
  return <ListingPage initialApplication={await getMyProviderApplication()} />;
}
