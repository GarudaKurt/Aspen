"use client";

import { create } from "zustand";
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

export type ListingDraft = {
  providerType: string;
  businessName: string;
  businessDescription: string;
  locationDetails: BusinessLocationDetails;
  selectedServices: string[];
  uploadedFiles: Record<string, string>;
  billing: BillingDetails;
};

type ListingStore = ListingDraft & {
  setProviderType: (providerType: string) => void;
  setBusinessField: (field: "businessName" | "businessDescription", value: string) => void;
  setLocationField: <K extends keyof BusinessLocationDetails>(field: K, value: BusinessLocationDetails[K]) => void;
  toggleService: (service: string) => void;
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
  locationDetails: initialBusinessLocation,
  selectedServices: [],
  uploadedFiles: {},
  billing: {
    fullName: "",
    email: "",
    address: "",
    method: "invoice",
  },
};

export const useListingStore = create<ListingStore>((set) => ({
  ...initialListingDraft,
  setProviderType: (providerType) => set({ providerType }),
  setBusinessField: (field, value) => set((state) => ({ ...state, [field]: value })),
  setLocationField: (field, value) =>
    set((state) => ({ locationDetails: { ...state.locationDetails, [field]: value } })),
  toggleService: (service) =>
    set((state) => ({
      selectedServices: state.selectedServices.includes(service)
        ? state.selectedServices.filter((item) => item !== service)
        : [...state.selectedServices, service],
    })),
  setUploadedFile: (label, fileName) =>
    set((state) => ({
      uploadedFiles: { ...state.uploadedFiles, [label]: fileName },
    })),
  setBillingField: (field, value) =>
    set((state) => ({
      billing: { ...state.billing, [field]: value },
    })),
  reset: () => set(initialListingDraft),
}));
