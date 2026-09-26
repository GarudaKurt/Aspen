import { MobileDashboardNav } from "@/features/tenant-dashboard/components/dashboard-shell";
import {
  AppointmentManagementPage,
  mockAppointmentRequests,
  tenantBusinessId,
} from "@/features/appointments";

export default function TenantAppointmentsPage() {
  return (
    <>
      <MobileDashboardNav />
      <AppointmentManagementPage
        initialAppointments={mockAppointmentRequests}
        businessId={tenantBusinessId}
      />
    </>
  );
}
