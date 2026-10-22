import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export function isEmailVerified(user: { email_confirmed_at?: string | null } | null | undefined) {
  return Boolean(user?.email_confirmed_at);
}

export async function getCurrentProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return profile ? { user, profile } : { user, profile: null };
}
