import { z } from "zod";
import type { AppointmentStatus } from "./types";

export const appointmentStatusSchema = z.enum([
  "Pending",
  "Confirmed",
  "Rejected",
  "Completed",
  "Cancelled",
]);

export const appointmentRequestSchema = z.object({
  appointmentId: z.string().trim().min(1),
  businessId: z.string().trim().min(1),
  customerId: z.string().trim().min(1),
  serviceId: z.string().trim().min(1),
  customerName: z.string().trim().min(1),
  customerEmail: z.string().trim().email(),
  customerPhone: z.string().trim().min(1),
  serviceName: z.string().trim().min(1),
  appointmentDate: z.string().date(),
  appointmentTime: z.string().trim().min(1),
  petName: z.string().trim().min(1),
  petType: z.string().trim().min(1),
  notes: z.string(),
  status: appointmentStatusSchema,
  rejectionReason: z.string().optional(),
});

export const appointmentStatusUpdateSchema = z.object({
  status: appointmentStatusSchema,
  rejectionReason: z.string().trim().max(500).optional(),
});

export type AppointmentRequestInput = z.infer<typeof appointmentRequestSchema>;
export type AppointmentStatusUpdate = z.infer<typeof appointmentStatusUpdateSchema>;
export type AppointmentStatusValue = AppointmentStatus;
