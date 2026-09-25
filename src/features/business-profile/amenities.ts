export type BusinessAmenity = {
  id: string;
  label: string;
  custom?: boolean;
};

export const amenityOptions: BusinessAmenity[] = [
  { id: "parking", label: "Parking" },
  { id: "wifi", label: "Wi-Fi" },
  { id: "air-conditioning", label: "Air Conditioning" },
  { id: "waiting-area", label: "Waiting Area" },
  { id: "pet-friendly-area", label: "Pet-Friendly Area" },
  { id: "accessibility", label: "Accessibility" },
];
