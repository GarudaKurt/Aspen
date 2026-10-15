export type BusinessLocationDetails = {
  province: string;
  cityMunicipality: string;
  barangay: string;
  streetAddress: string;
  landmark: string;
  additionalDetails: string;
  coordinates: [number, number] | null;
};

export function isValidBusinessCoordinates(
  coordinates: [number, number] | null | undefined,
): coordinates is [number, number] {
  if (!coordinates) return false;
  const [longitude, latitude] = coordinates;
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

export const initialBusinessLocation: BusinessLocationDetails = {
  province: "",
  cityMunicipality: "",
  barangay: "",
  streetAddress: "",
  landmark: "Near Cebu IT Park",
  additionalDetails: "",
  coordinates: null,
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
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : fallback;
}

export function getBusinessLocationSummary(
  location: Partial<BusinessLocationDetails> | undefined,
  fallback: string,
) {
  if (!location) return fallback;
  const city = location.cityMunicipality?.trim();
  const street = location.streetAddress?.trim();
  const landmark = location.landmark?.trim();
  const parts = [
    street,
    landmark
      ? landmark.toLowerCase().startsWith("near ")
        ? landmark
        : `Near ${landmark}`
      : "",
    city,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : fallback;
}

export function getBusinessCardLocationSummary(
  location: Partial<BusinessLocationDetails> | undefined,
  fallback: string,
) {
  if (!location) return fallback;
  const parts = [
    location.streetAddress?.trim(),
    location.cityMunicipality?.trim(),
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : fallback;
}

