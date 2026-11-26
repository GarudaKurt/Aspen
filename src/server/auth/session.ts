import "server-only";
import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";

// React memoizes these reads only within the current server render.
export const getCurrentUser = cache(async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

export function isEmailVerified(user: { email_confirmed_at?: string | null } | null | undefined) {
  return Boolean(user?.email_confirmed_at);
}

export const getCurrentProfile = cache(async function getCurrentProfile() {
  const user = await getCurrentUser();

  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return profile ? { user, profile } : { user, profile: null };
});
