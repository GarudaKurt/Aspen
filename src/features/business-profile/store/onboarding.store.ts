"use client";

import { create } from "zustand";

export type BillingDetails = {
 fullName: string;
  email: string;
  address: string;
  method: "invoice" | "online";
};

export type ListingDraft = {
  providerType: string;
  selectedServices: string[];
  uploadedFiles: Record<string, string>;
  billing: BillingDetails;
};

type ListingStore = ListingDraft & {
  setProviderType: (providerType: string) => void;
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
