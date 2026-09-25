import { notFound } from "next/navigation";
import { BusinessProfile } from "@/features/business-profile/components/business-profile";
import { mockBusinesses } from "@/components/landing/mock-businesses";

function getReviews(rating: string) {
  const match = rating.match(/\(([^)]+)\)/);
  return match ? `${match[1]} reviews` : rating;
}

export default async function BusinessProfileBySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = mockBusinesses.find((item) => item.slug === slug);

  if (!business) notFound();

  const provider = {
    name: business.businessName,
    rating: business.rating.split(" ")[0],
    reviews: getReviews(business.rating),
    category: business.services,
    address: business.location,
    coverPhoto: business.images?.[0]?.src ?? null,
    serviceCoverage: [business.services],
    verified: true,
  };

  return <BusinessProfile provider={provider} />;
}
