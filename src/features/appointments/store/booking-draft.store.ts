"use client";

import { create } from "zustand";

export type Period = "Morning" | "Afternoon" | "Evening";

export type AppointmentDraft = {
  businessSlug: string | null;
  serviceIds: string[];
  date: string;
  period: Period;
  time: string;
  petName: string;
  petType: string;
  reason: string;
  fullName: string;
  phone: string;
  email: string;
};

export const initialAppointmentDraft: AppointmentDraft = {
  businessSlug: null,
  serviceIds: [],
  date: "",
  period: "Morning",
  time: "",
  petName: "",
  petType: "",
  reason: "",
  fullName: "",
  phone: "",
  email: "",
};

type AppointmentDraftStore = {
  draft: AppointmentDraft;
  updateDraft: (update: Partial<AppointmentDraft>) => void;
  resetDraft: (businessSlug?: string | null) => void;
};

export const useBookingDraftStore = create<AppointmentDraftStore>((set) => ({
  draft: initialAppointmentDraft,
  updateDraft: (update) =>
    set((state) => ({ draft: { ...state.draft, ...update } })),
  resetDraft: (businessSlug = null) =>
    set({ draft: { ...initialAppointmentDraft, businessSlug } }),
}));

export function resetBookingDraft(businessSlug?: string | null) {
  useBookingDraftStore.getState().resetDraft(businessSlug);
}
