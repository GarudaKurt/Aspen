import { ProfileView } from "@/features/tenant-dashboard/components/profile-view";
import { getMyBusiness } from "@/features/tenancy/api/queries";
import { initialTenantProfile } from "@/features/tenant-dashboard/profile/profile.store";

export const dynamic = "force-dynamic";

export default async function TenantProfilePage() {
  const business = await getMyBusiness();
  const initialProfile = business
    ? {
        ...initialTenantProfile,
        name: business.name,
        description: business.description,
        address: business.location
          ? [business.location.streetAddress, business.location.cityMunicipality, business.location.province].filter(Boolean).join(", ")
          : initialTenantProfile.address,
        locationDetails: business.location ?? initialTenantProfile.locationDetails,
        serviceCoverage: business.amenities.length ? business.amenities.map((item) => item.label) : initialTenantProfile.serviceCoverage,
        businessHours: business.hours.length ? business.hours : initialTenantProfile.businessHours,
        amenities: business.amenities,
        verified: business.verified,
        slug: business.slug,
        coverPhoto: business.coverPhotoPath,
      }
    : initialTenantProfile;
  return (
    <ProfileView
      initialProfile={initialProfile}
      businessId={business?.id}
      providerType={business?.providerType}
      yearsExperience={business?.yearsExperience}
      facebookPage={business?.facebookPage}
    />
  );
}
