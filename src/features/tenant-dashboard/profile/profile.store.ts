"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { TenantProfileData } from "@/features/business-profile/components/business-profile";
import {
  initialBusinessHours,
  type BusinessHoursDay,
} from "@/features/business-profile/business-hours";
import { type BusinessAmenity } from "@/features/business-profile/amenities";
import { tenantProfileSchema } from "./profile.schema";

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

type TenantProfileStore = {
  profile: TenantProfile;
  updateTenantProfile: (update: Partial<TenantProfile>) => void;
};

export const useTenantProfileStore = create<TenantProfileStore>()(
  persist(
    (set) => ({
      profile: initialTenantProfile,
      updateTenantProfile: (update) =>
        set((state) => ({
          profile: { ...state.profile, ...update },
        })),
    }),
    {
      name: "aspen-tenant-profile",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ profile: state.profile }),
      merge: (persisted, current) => {
        const parsed = tenantProfileSchema
          .partial()
          .safeParse(
            typeof persisted === "object" &&
              persisted !== null &&
              "profile" in persisted
              ? persisted.profile
              : persisted,
          );

        return parsed.success
          ? { ...current, profile: { ...current.profile, ...parsed.data } }
          : current;
      },
    },
  ),
);

export function useTenantProfile() {
  return useTenantProfileStore((state) => state.profile);
}

export function updateTenantProfile(update: Partial<TenantProfile>) {
  useTenantProfileStore.getState().updateTenantProfile(update);
}
