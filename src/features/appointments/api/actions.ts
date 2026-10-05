import { appointmentStatusUpdateSchema } from "../schemas";
import type { AppointmentRequest } from "../types";

type UpdateResult =
  | { ok: true; appointment: AppointmentRequest }
  | { ok: false; error: string };

export function updateAppointmentStatus(
  appointment: AppointmentRequest,
  input: unknown,
): UpdateResult {
  const parsed = appointmentStatusUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "The appointment update is invalid." };
  }

  if (
    appointment.status !== "Pending" &&
    (parsed.data.status === "Confirmed" || parsed.data.status === "Rejected")
  ) {
    return {
      ok: false,
      error: "This appointment has already been processed.",
    };
  }

  return {
    ok: true,
    appointment: {
      ...appointment,
      status: parsed.data.status,
      rejectionReason: parsed.data.rejectionReason || undefined,
    },
  };
}
