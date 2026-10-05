export type AppointmentStatus =
  | "Pending"
  | "Confirmed"
  | "Rejected"
  | "Completed"
  | "Cancelled";

export type AppointmentRequest = {
  appointmentId: string;
  businessId: string;
  customerId: string;
  serviceId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  petName: string;
  petType: string;
  notes: string;
  status: AppointmentStatus;
  rejectionReason?: string;
};

export type AppointmentStatusFilter = "All" | AppointmentStatus;

export type AppointmentDateFilter =
  | "all"
  | "today"
  | "upcoming"
  | "this-week";
