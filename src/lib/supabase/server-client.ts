import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getRequiredSupabaseConfig } from "./config";

/** Public catalog reads must not inherit an owner's/admin's broader RLS access. */
export async function createSupabasePublicClient() {
  const { url, anonKey } = getRequiredSupabaseConfig();
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function createSupabaseServerClient() {
  const { url, anonKey } = getRequiredSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server components cannot always write cookies. Proxy refreshes them.
        }
      },
    },
  });
}
