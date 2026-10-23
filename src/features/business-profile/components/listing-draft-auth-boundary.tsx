"use client";

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
    let active = true;

    const claimDraftForUser = (userId: string) => {
      if (!active) return;

      const previousOwner = window.sessionStorage.getItem(
        LISTING_DRAFT_OWNER_STORAGE_KEY,
      );

      if (previousOwner && previousOwner !== userId) {
        clearListingDraft();
      }

      window.sessionStorage.setItem(LISTING_DRAFT_OWNER_STORAGE_KEY, userId);
    };

    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) claimDraftForUser(data.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        clearListingDraft();
        return;
      }

      if (session?.user) claimDraftForUser(session.user.id);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
