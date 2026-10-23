import { MobileDashboardNav } from "@/features/tenant-dashboard/components/dashboard-shell";
import { ServicesView } from "@/features/tenant-dashboard/components/services-view";
import { getMyBusiness, getMyServices } from "@/features/tenancy/api/queries";

export const dynamic = "force-dynamic";

export default async function TenantServicesPage() {
  const business = await getMyBusiness();
  const services = business ? await getMyServices(business.id) : [];
  return (
    <>
      <MobileDashboardNav />
      <ServicesView initialServices={services} businessId={business?.id} />
    </>
  );
}
