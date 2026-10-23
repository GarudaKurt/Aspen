"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  initialBusinessLocation,
  type BusinessLocationDetails,
} from "../location";

export type BillingDetails = {
  fullName: string;
  email: string;
  address: string;
  method: "invoice" | "online";
};

export type IdentityDetails = {
  fullName: string;
  idType: string;
  contactNumber: string;
  verificationStatus: "idle" | "verified" | "invalid";
};

export type ListingDraft = {
  providerType: string;
  businessName: string;
  businessDescription: string;
  yearsExperience: string;
  facebookPage: string;
  locationDetails: BusinessLocationDetails;
  selectedServices: string[];
  identity: IdentityDetails;
  uploadedFiles: Record<string, string>;
  billing: BillingDetails;
};

export const LISTING_DRAFT_OWNER_STORAGE_KEY = "aspen-listing-draft-owner";

type ListingStore = ListingDraft & {
  identityFiles: Record<string, File>;
  setProviderType: (providerType: string) => void;
  setBusinessField: (
    field: "businessName" | "businessDescription" | "yearsExperience" | "facebookPage",
    value: string,
  ) => void;
  setLocationField: <K extends keyof BusinessLocationDetails>(field: K, value: BusinessLocationDetails[K]) => void;
  toggleService: (service: string) => void;
  setIdentityField: <K extends keyof IdentityDetails>(field: K, value: IdentityDetails[K]) => void;
  setIdentityFile: (label: string, file: File) => void;
  setUploadedFile: (label: string, fileName: string) => void;
  setBillingField: <K extends keyof BillingDetails>(
    field: K,
    value: BillingDetails[K],
  ) => void;
  reset: () => void;
};

export const initialListingDraft: ListingDraft = {
  providerType: "Individual provider",
  businessName: "",
  businessDescription: "",
  yearsExperience: "",
  facebookPage: "",
  locationDetails: initialBusinessLocation,
  selectedServices: [],
  identity: {
    fullName: "",
    idType: "National ID",
    contactNumber: "",
    verificationStatus: "idle",
  },
  uploadedFiles: {},
  billing: {
    fullName: "",
    email: "",
    address: "",
    method: "invoice",
  },
};

export const useListingStore = create<ListingStore>()(
  persist(
    (set) => ({
      ...initialListingDraft,
      identityFiles: {},
      setProviderType: (providerType) => set({ providerType }),
      setBusinessField: (field, value) => set((state) => ({ ...state, [field]: value })),
      setLocationField: (field, value) =>
        set((state) => ({
          locationDetails: {
            ...state.locationDetails,
            [field]: value,
            ...(field === "coordinates" ? {} : { coordinates: null }),
          },
        })),
      toggleService: (service) =>
        set((state) => ({
          selectedServices: state.selectedServices.includes(service)
            ? state.selectedServices.filter((item) => item !== service)
            : [...state.selectedServices, service],
        })),
      setIdentityField: (field, value) =>
        set((state) => ({
          identity: { ...state.identity, [field]: value },
        })),
      setIdentityFile: (label, file) =>
        set((state) => ({
          identityFiles: { ...state.identityFiles, [label]: file },
        })),
      setUploadedFile: (label, fileName) =>
        set((state) => ({
          uploadedFiles: { ...state.uploadedFiles, [label]: fileName },
        })),
      setBillingField: (field, value) =>
        set((state) => ({
          billing: { ...state.billing, [field]: value },
        })),
      reset: () => set({ ...initialListingDraft, identityFiles: {} }),
    }),
    {
      name: "aspen-listing-draft",
      storage: createJSONStorage(() => sessionStorage),
      // Persist only non-sensitive draft fields. Identity details/files and
      // billing details remain in memory and are never written to storage.
      partialize: (state) => ({
        providerType: state.providerType,
        businessName: state.businessName,
        businessDescription: state.businessDescription,
        yearsExperience: state.yearsExperience,
        facebookPage: state.facebookPage,
        locationDetails: state.locationDetails,
        selectedServices: state.selectedServices,
        uploadedFiles: {},
        billing: initialListingDraft.billing,
      }),
    },
  ),
);

/**
 * Clears both the in-memory draft and its browser-session copy. This is used
 * when a session ends or a different account signs in so one account's
 * registration details cannot be shown to another account on the same tab.
 */
export function clearListingDraft() {
  useListingStore.getState().reset();
  useListingStore.persist.clearStorage();

  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(LISTING_DRAFT_OWNER_STORAGE_KEY);
  }
}
