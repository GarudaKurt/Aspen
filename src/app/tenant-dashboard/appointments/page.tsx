import { MobileDashboardNav } from "@/features/tenant-dashboard/components/dashboard-shell";
import { AppointmentManagementPage } from "@/features/appointments/components/appointment-management-page";
import {
  mockAppointmentRequests,
  tenantBusinessId,
} from "@/features/appointments/mock-data";

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
