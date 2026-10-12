"use client";

import { create } from "zustand";

type FavoritesState = {
  favoriteSlugs: string[];
  isFavorite: (slug?: string) => boolean;
  toggleFavorite: (slug: string) => boolean;
};

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favoriteSlugs: [],
  isFavorite: (slug) => Boolean(slug && get().favoriteSlugs.includes(slug)),
  toggleFavorite: (slug) => {
    const isSaved = get().favoriteSlugs.includes(slug);
    set((state) => ({
      favoriteSlugs: isSaved
        ? state.favoriteSlugs.filter((item) => item !== slug)
        : [...state.favoriteSlugs, slug],
    }));
    return !isSaved;
  },
}));
