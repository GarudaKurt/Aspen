import { appointmentRequestSchema } from "../schemas";
import type { AppointmentRequest } from "../types";

export function mapAppointmentRow(row: Record<string, unknown>): AppointmentRequest {
  return {
    appointmentId: String(row.id ?? ""),
    bookingReference: String(row.booking_reference ?? ""),
    businessId: String(row.business_id ?? ""),
    businessName: String(row.business_name ?? "Business provider"),
    serviceId: String(row.service_id ?? ""),
    customerId: String(row.customer_id ?? ""),
    customerName: String(row.customer_name ?? ""),
    customerEmail: String(row.customer_email ?? ""),
    customerPhone: String(row.customer_phone ?? ""),
    serviceName: String(row.service_name ?? ""),
    appointmentDate: String(row.appointment_date ?? ""),
    appointmentTime: String(row.appointment_time ?? ""),
    petName: String(row.pet_name ?? ""),
    petType: String(row.pet_type ?? ""),
    notes: String(row.notes ?? ""),
    status: row.status as AppointmentRequest["status"],
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : undefined,
  };
}

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
