import { appointmentRequestSchema } from "../schemas";
import type { AppointmentRequest } from "../types";

export function getTenantAppointments(
  requests: AppointmentRequest[],
  businessId: string,
): AppointmentRequest[] {
  return requests
    .map((request) => appointmentRequestSchema.safeParse(request))
    .filter((result) => result.success && result.data.businessId === businessId)
    .map((result) => result.data);
}
