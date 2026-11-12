import { notFound } from "next/navigation";
import { BusinessProfile } from "@/features/business-profile/components/business-profile";
import { getPublishedBusiness, getPublishedBusinessServices } from "@/features/tenancy/api/queries";
import { formatBusinessAddress } from "@/features/business-profile/location";
export const dynamic = "force-dynamic";
export default async function BusinessProfileBySlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await getPublishedBusiness(slug);
  if (!business) notFound();
  const services = await getPublishedBusinessServices(business.id);
  const prices = services.flatMap((service) => service.startingPrice === null ? [] : [service.startingPrice]);
  return <BusinessProfile provider={{
    name: business.name, rating: "", reviews: "No reviews yet", category: business.providerType,
    address: formatBusinessAddress(business.location), locationDetails: business.location,
    description: business.description, serviceCoverage: [...new Set(services.map((service) => service.category))],
    servicesOffered: services, coverPhoto: business.coverPhotoPath, photos: business.photos.map((photo) => photo.url),
    businessHours: business.hours, slug: business.slug, amenities: business.amenities,
    verified: business.verified, createdAt: business.createdAt,
    startingPrice: prices.length ? Math.min(...prices) : null,
  }} />;
}
