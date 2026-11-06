import { notFound } from "next/navigation";
import { getPublishedBusiness, getPublishedBusinessServices } from "@/features/tenancy/api/queries";
import { formatBusinessAddress } from "@/features/business-profile/location";
import { AppointmentPage } from "./appointment-page";
export async function BusinessAppointmentPage({ slug }: { slug: string }) {
  const business = await getPublishedBusiness(slug);
  if (!business) notFound();
  const services = await getPublishedBusinessServices(business.id);
  return <AppointmentPage businessSlug={slug} businessName={business.name}
    businessLocation={formatBusinessAddress(business.location)} businessCategory={business.providerType}
    businessRating="" businessImage={business.coverPhotoPath} services={services} />;
}
