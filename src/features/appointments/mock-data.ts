import type { AppointmentRequest, AppointmentStatus } from "./types";

export const tenantBusinessId = "pawspot-cebu";

const statusGroups: Array<{
  status: AppointmentStatus;
  serviceNames: string[];
  notes: string;
}> = [
  {
    status: "Pending",
    serviceNames: ["Full Grooming Package", "General Consultation"],
    notes: "Customer is waiting for the provider's confirmation.",
  },
  {
    status: "Confirmed",
    serviceNames: ["Core Vaccination", "General Consultation"],
    notes: "Please confirm the appointment details with the customer.",
  },
  {
    status: "Completed",
    serviceNames: ["Dental Cleaning", "Overnight Boarding"],
    notes: "Appointment was completed successfully.",
  },
  {
    status: "Rejected",
    serviceNames: ["Full Grooming Package", "Core Vaccination"],
    notes: "The requested schedule was not available.",
  },
  {
    status: "Cancelled",
    serviceNames: ["General Consultation", "Overnight Boarding"],
    notes: "Customer cancelled the appointment request.",
  },
];

const customerNames = [
  "Juan Dela Cruz",
  "Maria Santos",
  "Ben Edison",
  "Liza Reyes",
  "Ana Garcia",
  "Carlo Mendoza",
  "Sofia Cruz",
  "Daniel Lim",
  "Nina Flores",
  "Marco Villanueva",
];

const petNames = [
  "Bingo",
  "Milo",
  "Coco",
  "Pepper",
  "Luna",
  "Oreo",
  "Buddy",
  "Simba",
  "Cookie",
  "Max",
];

const petTypes = [
  "Golden Retriever",
  "Domestic Shorthair Cat",
  "Shih Tzu",
  "Beagle",
  "Pomeranian",
  "Mixed Breed",
];

function createMockAppointment(
  status: AppointmentStatus,
  index: number,
  serviceNames: string[],
  notes: string,
): AppointmentRequest {
  const customerIndex = index % customerNames.length;
  const serviceIndex = index % serviceNames.length;
  const day = String(1 + ((index * 2) % 28)).padStart(2, "0");
  const phoneSuffix = String(71234567 + index).padStart(8, "0");
  const appointmentId = status.toLowerCase().replace(/[^a-z]+/g, "-");

  return {
    appointmentId: `apt-${appointmentId}-${String(index + 1).padStart(2, "0")}`,
    businessId: tenantBusinessId,
    customerId: `customer-${customerIndex + 1}`,
    serviceId: `service-${serviceNames[serviceIndex].toLowerCase().replace(/[^a-z]+/g, "-")}`,
    customerName: customerNames[customerIndex],
    customerEmail: `${customerNames[customerIndex].toLowerCase().replace(/ /g, ".")}@example.com`,
    customerPhone: `+639${phoneSuffix}`,
    serviceName: serviceNames[serviceIndex],
    appointmentDate: `2026-10-${day}`,
    appointmentTime: ["8:00 AM", "10:30 AM", "1:00 PM", "3:30 PM", "6:00 PM"][index % 5],
    petName: petNames[index % petNames.length],
    petType: petTypes[index % petTypes.length],
    notes,
    status,
    ...(status === "Rejected"
      ? { rejectionReason: "The requested schedule was not available." }
      : {}),
  };
}

export const mockAppointmentRequests: AppointmentRequest[] = statusGroups.flatMap(
  ({ status, serviceNames, notes }) =>
    Array.from({ length: 10 }, (_, index) =>
      createMockAppointment(status, index, serviceNames, notes),
    ),
);
