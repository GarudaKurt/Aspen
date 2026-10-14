import type { TenantProfileData } from "@/features/business-profile/components/business-profile";
import {
  initialBusinessHours,
  type BusinessHoursDay,
} from "@/features/business-profile/business-hours";
import { type BusinessAmenity } from "@/features/business-profile/amenities";
import {
  formatBusinessAddress,
  initialBusinessLocation,
  type BusinessLocationDetails,
} from "@/features/business-profile/location";

export type TenantProfile = TenantProfileData & {
  description: string;
  serviceCoverage: string[];
  weeklyAvailabilitySet: boolean;
  businessHours: BusinessHoursDay[];
  amenities: BusinessAmenity[];
  locationDetails: BusinessLocationDetails;
};

export const initialTenantProfile: TenantProfile = {
  name: "PawSpot Grooming & Boarding",
  rating: "4.9",
  reviews: "38 reviews",
  favorites: 24,
  category: "Grooming, Boarding",
  address: formatBusinessAddress(initialBusinessLocation),
  description:
    "Full-service grooming and short-stay boarding for dogs and cats.",
  serviceCoverage: ["Grooming", "Boarding", "Training"],
  coverPhoto: null,
  weeklyAvailabilitySet: false,
  businessHours: initialBusinessHours,
  amenities: [
    { id: "parking", label: "Parking" },
    { id: "wifi", label: "Wi-Fi" },
    { id: "pet-friendly-area", label: "Pet-Friendly Area" },
  ],
  locationDetails: initialBusinessLocation,
  verified: true,
  // Demo fallback until the authenticated Supabase provider profile supplies created_at.
  createdAt: "2024-01-15T00:00:00.000Z",
};
