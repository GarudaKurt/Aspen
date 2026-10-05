import { services, serviceAnalytics } from "@/features/tenant-dashboard/mock-data";
import { MobileDashboardNav } from "@/features/tenant-dashboard/components/dashboard-shell";
import { ServicesView } from "@/features/tenant-dashboard/components/services-view";

export default function TenantServicesPage() {
  return (
    <>
      <MobileDashboardNav />
      <ServicesView initialServices={services} initialAnalytics={serviceAnalytics} />
    </>
  );
}
