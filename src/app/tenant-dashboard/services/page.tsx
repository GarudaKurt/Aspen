import { ServicesView } from "@/features/tenant-dashboard/components/services-view";
import { getMyBusiness, getMyServices } from "@/features/tenancy/api/queries";
import { getServiceManagementAccess } from "@/features/tenancy/service-access";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const dynamic = "force-dynamic";

export default async function TenantServicesPage() {
  const business = await getMyBusiness();
  const services = business ? await getMyServices(business.id) : [];
  const access = business
    ? await getServiceManagementAccess(await createSupabaseServerClient(), business.id, business.ownerId)
    : { allowed: false, error: "Complete your business application to manage services." };
  return (
    <>
      <ServicesView initialServices={services} businessId={business?.id} canManage={access.allowed} accessMessage={access.error} />
    </>
  );
}
