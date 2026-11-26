"use client";

import { useFavoritesStore } from "@/features/favorites/store/favorites.store";
import { useEffect } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import {
  clearListingDraft,
  LISTING_DRAFT_OWNER_STORAGE_KEY,
} from "../store/onboarding.store";

/**
 * Keeps the temporary provider-registration draft scoped to the authenticated
 * account without removing guest progress before authentication.
 */
export function ListingDraftAuthBoundary() {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let previousOwner = window.sessionStorage.getItem(LISTING_DRAFT_OWNER_STORAGE_KEY);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const owner = session?.user.id;
      if (event === "SIGNED_OUT" || (event === "INITIAL_SESSION" && !owner && previousOwner)) {
        useFavoritesStore.setState({ favoriteSlugs: [] });
        clearListingDraft();
        previousOwner = null;
        return;
      }

      if (owner) {
        if (previousOwner && previousOwner !== owner) {
          useFavoritesStore.setState({ favoriteSlugs: [] });
          clearListingDraft();
        }
        previousOwner = owner;
        window.sessionStorage.setItem(LISTING_DRAFT_OWNER_STORAGE_KEY, owner);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
