import type { TenantProfileData } from "@/features/business-profile/components/business-profile";
import {
  initialBusinessHours,
  type BusinessHoursDay,
} from "@/features/business-profile/business-hours";
import { type BusinessAmenity } from "@/features/business-profile/amenities";

export type TenantProfile = TenantProfileData & {
  description: string;
  serviceCoverage: string[];
  weeklyAvailabilitySet: boolean;
  businessHours: BusinessHoursDay[];
  amenities: BusinessAmenity[];
};

export const initialTenantProfile: TenantProfile = {
  name: "PawSpot Grooming & Boarding",
  rating: "4.9",
  reviews: "38 reviews",
  favorites: 24,
  category: "Grooming, Boarding",
  address: "Cebu City",
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
  verified: true,
};
