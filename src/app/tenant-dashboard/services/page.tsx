import { ServicesView } from "@/features/tenant-dashboard/components/services-view";
import { getMyBusiness, getMyServices } from "@/features/tenancy/api/queries";

export const dynamic = "force-dynamic";

export default async function TenantServicesPage() {
  const business = await getMyBusiness();
  const services = business ? await getMyServices(business.id) : [];
  return (
    <>
      <ServicesView initialServices={services} businessId={business?.id} businessStatus={business?.status} />
    </>
  );
}
