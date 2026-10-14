export type BusinessLocationDetails = {
  province: string;
  cityMunicipality: string;
  barangay: string;
  streetAddress: string;
  landmark: string;
  additionalDetails: string;
  coordinates: [number, number] | null;
};

export const initialBusinessLocation: BusinessLocationDetails = {
  province: "Cebu",
  cityMunicipality: "Cebu City",
  barangay: "Lahug",
  streetAddress: "48 Carlock Street",
  landmark: "Near Cebu IT Park",
  additionalDetails: "",
  coordinates: [123.9024, 10.3307],
};

export function formatBusinessAddress(
  location: Partial<BusinessLocationDetails> | undefined,
  fallback = "Location details unavailable",
) {
  if (!location) return fallback;
  const parts = [
    location.streetAddress,
    location.barangay,
    location.cityMunicipality,
    location.province,
    "Philippines",
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : fallback;
}

