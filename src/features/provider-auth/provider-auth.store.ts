"use client";

import { create } from "zustand";

export const mockProviderCredentials = {
  email: "provider@aspen.test",
  password: "AspenProvider123!",
} as const;

type ProviderAuthState = {
  authenticated: boolean;
  hydrated: boolean;
  hydrate: () => void;
  login: () => void;
  logout: () => void;
};

const storageKey = "aspen-mock-provider-auth";

export const useProviderAuthStore = create<ProviderAuthState>((set) => ({
  authenticated: false,
  hydrated: false,
  hydrate: () => {
    const authenticated =
      typeof window !== "undefined" &&
      window.sessionStorage.getItem(storageKey) === "true";
    set({ authenticated, hydrated: true });
  },
  login: () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(storageKey, "true");
    }
    set({ authenticated: true, hydrated: true });
  },
  logout: () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(storageKey);
    }
    set({ authenticated: false, hydrated: true });
  },
}));
