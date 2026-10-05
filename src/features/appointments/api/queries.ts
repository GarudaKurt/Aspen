import { appointmentRequestSchema } from "../schemas";
import type { AppointmentRequest } from "../types";

export function getTenantAppointments(
  requests: AppointmentRequest[],
  businessId: string,
): AppointmentRequest[] {
  return requests.reduce<AppointmentRequest[]>((validRequests, request) => {
    const parsed = appointmentRequestSchema.safeParse(request);
    if (parsed.success && parsed.data.businessId === businessId) {
      validRequests.push(parsed.data);
    }
    return validRequests;
  }, []);
}
