import { notFound } from "next/navigation";
import { BusinessProfile } from "@/features/business-profile/components/business-profile";
import { mockBusinesses } from "@/components/landing/mock-businesses";
import { getPublishedBusiness, getPublishedBusinessServices } from "@/features/tenancy/api/queries";
import { formatBusinessAddress } from "@/features/business-profile/location";

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
  const liveBusiness = await getPublishedBusiness(slug);
  if (liveBusiness) {
    const services = await getPublishedBusinessServices(liveBusiness.id);
    const serviceCoverage = Array.from(new Set(services.map((service) => service.category)));
    return (
      <BusinessProfile
        provider={{
          name: liveBusiness.name,
          rating: "New",
          reviews: "No reviews yet",
          category: liveBusiness.providerType,
          address: formatBusinessAddress(liveBusiness.location),
          locationDetails: liveBusiness.location,
          description: liveBusiness.description,
          serviceCoverage,
          servicesOffered: services,
          coverPhoto: liveBusiness.coverPhotoPath,
          businessHours: liveBusiness.hours,
          slug: liveBusiness.slug,
          amenities: liveBusiness.amenities,
          verified: liveBusiness.verified,
        }}
      />
    );
  }
  const business = mockBusinesses.find((item) => item.slug === slug);

  if (!business) notFound();

  const provider = {
    name: business.businessName,
    rating: business.rating.split(" ")[0],
    reviews: getReviews(business.rating),
    category: business.services,
    address: business.location,
    locationDetails: business.locationDetails,
    coverPhoto: business.images?.[0]?.src ?? null,
    slug: business.slug,
    serviceCoverage: [business.services],
    servicesOffered: business.servicesOffered?.map((service) => ({
      id: service.id,
      title: service.title,
      category: service.category,
      description: service.description,
      price: service.price,
    })),
    verified: true,
  };

  return <BusinessProfile provider={provider} />;
}
