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
  landmark: "",
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

export function formatBusinessLandmark(landmark: string | undefined) {
  const value = landmark?.trim();
  if (!value) return "";
  return /^near\s/i.test(value) ? value : `Near ${value}`;
}

export function getBusinessLocationSummary(
  location: Partial<BusinessLocationDetails> | undefined,
  fallback: string,
) {
  if (!location) return fallback;
  const city = location.cityMunicipality?.trim();
  const street = location.streetAddress?.trim();
  const landmark = formatBusinessLandmark(location.landmark);
  const parts = [
    street,
    landmark,
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

