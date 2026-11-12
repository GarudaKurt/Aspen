import { ProfileView } from "@/features/tenant-dashboard/components/profile-view";
import { getMyBusiness, getMyServices } from "@/features/tenancy/api/queries";
import { formatBusinessAddress } from "@/features/business-profile/location";
export const dynamic = "force-dynamic";
export default async function TenantProfilePage() {
  const business = await getMyBusiness();
  if (!business) return <p className="rounded-xl border p-6 text-slate-500">Your business profile will be available after your application is approved.</p>;
  const services = await getMyServices(business.id);
  const location = business.location ?? { province: "", cityMunicipality: "", barangay: "", streetAddress: "", landmark: "", additionalDetails: "", coordinates: null };
  return <ProfileView businessId={business.id} providerType={business.providerType}
    yearsExperience={business.yearsExperience} facebookPage={business.facebookPage} photos={business.photos}
    initialProfile={{
      name: business.name, rating: "", reviews: "No reviews yet", category: business.providerType,
      description: business.description, address: formatBusinessAddress(business.location), locationDetails: location,
      serviceCoverage: [...new Set(services.filter((service) => service.status === "Active").map((service) => service.category))],
      servicesOffered: services.filter((service) => service.status === "Active"),
      businessHours: business.hours, weeklyAvailabilitySet: business.hours.length > 0,
      amenities: business.amenities, verified: business.verified, slug: business.slug,
      coverPhoto: business.coverPhotoPath, photos: business.photos.map((photo) => photo.url), createdAt: business.createdAt,
    }} />;
}
