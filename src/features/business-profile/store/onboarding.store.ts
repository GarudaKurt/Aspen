"use client";

import { create } from "zustand";

export type ListingDraft = {
  providerType: string;
  selectedServices: string[];
  uploadedFiles: Record<string, string>;
};

type ListingStore = ListingDraft & {
  setProviderType: (providerType: string) => void;
  toggleService: (service: string) => void;
  setUploadedFile: (label: string, fileName: string) => void;
  reset: () => void;
};

export const initialListingDraft: ListingDraft = {
  providerType: "Individual provider",
  selectedServices: [],
  uploadedFiles: {},
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
  reset: () => set(initialListingDraft),
}));
