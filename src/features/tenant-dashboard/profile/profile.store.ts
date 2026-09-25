"use client";

import { useSyncExternalStore } from "react";
import type { TenantProfileData } from "@/features/business-profile/components/business-profile";
import { initialBusinessHours, type BusinessHoursDay } from "@/features/business-profile/business-hours";
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
  category: "Grooming, Boarding",
  address: "Cebu City",
  description: "Full-service grooming and short-stay boarding for dogs and cats.",
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

const storageKey = "aspen-tenant-profile";
let profile = initialTenantProfile;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) profile = { ...initialTenantProfile, ...JSON.parse(stored) };
  } catch {
    profile = initialTenantProfile;
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function useTenantProfile() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => profile,
    () => initialTenantProfile,
  );
}

export function updateTenantProfile(update: Partial<TenantProfile>) {
  profile = { ...profile, ...update };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey, JSON.stringify(profile));
  }

  notify();
}
