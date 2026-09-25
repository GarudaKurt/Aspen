"use client";

import { useSyncExternalStore } from "react";

const storageKey = "aspen-favorite-businesses";
const favoriteBusinesses = new Set<string>();
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    if (Array.isArray(stored)) {
      stored.filter((value): value is string => typeof value === "string").forEach((value) => {
        favoriteBusinesses.add(value);
      });
    }
  } catch {
    // Ignore malformed local state and start with an empty favorites set.
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

function persist() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey, JSON.stringify([...favoriteBusinesses]));
  }
}

export function useFavoriteBusiness(businessKey: string) {
  const isFavorite = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => favoriteBusinesses.has(businessKey),
    () => false,
  );

  const toggleFavorite = () => {
    if (favoriteBusinesses.has(businessKey)) {
      favoriteBusinesses.delete(businessKey);
    } else {
      favoriteBusinesses.add(businessKey);
    }
    persist();
    notify();
  };

  return { isFavorite, toggleFavorite };
}
