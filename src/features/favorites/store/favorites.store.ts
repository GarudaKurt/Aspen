"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { favoritesStateSchema, favoriteBusinessIdSchema, type FavoritesStateData } from "../schemas/favorites.schema";

type FavoritesStore = FavoritesStateData & {
  toggleFavorite: (businessId: string) => void;
  addFavorite: (businessId: string) => void;
  removeFavorite: (businessId: string) => void;
  isFavorite: (businessId: string) => boolean;
};

function normalizeIds(ids: string[]) {
  return favoritesStateSchema.parse({ favoriteIds: ids }).favoriteIds;
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      favoriteIds: [],
      toggleFavorite: (businessId) => {
        const parsedId = favoriteBusinessIdSchema.safeParse(businessId.trim());
        if (!parsedId.success) return;
        const currentIds = get().favoriteIds;
        const nextIds = currentIds.includes(parsedId.data)
          ? currentIds.filter((id) => id !== parsedId.data)
          : [...currentIds, parsedId.data];
        set({ favoriteIds: normalizeIds(nextIds) });
      },
      addFavorite: (businessId) => {
        const parsedId = favoriteBusinessIdSchema.safeParse(businessId.trim());
        if (!parsedId.success) return;
        set({ favoriteIds: normalizeIds([...get().favoriteIds, parsedId.data]) });
      },
      removeFavorite: (businessId) => {
        const parsedId = favoriteBusinessIdSchema.safeParse(businessId.trim());
        if (!parsedId.success) return;
        set({ favoriteIds: get().favoriteIds.filter((id) => id !== parsedId.data) });
      },
      isFavorite: (businessId) => {
        const parsedId = favoriteBusinessIdSchema.safeParse(businessId.trim());
        return parsedId.success && get().favoriteIds.includes(parsedId.data);
      },
    }),
    {
      name: "aspen-favorites",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ favoriteIds: normalizeIds(state.favoriteIds) }),
      merge: (persisted, current) => {
        const parsed = favoritesStateSchema.safeParse(persisted);
        return parsed.success ? { ...current, favoriteIds: parsed.data.favoriteIds } : current;
      },
    },
  ),
);
