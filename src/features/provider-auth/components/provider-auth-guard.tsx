"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export function ProviderAuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "authenticated" | "signed-out" | "unverified">("loading");

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => {};

    Promise.resolve()
      .then(() => getSupabaseBrowserClient())
      .then((supabase) => {
        supabase.auth.getUser().then(({ data }) => {
          if (!active) return;
          if (!data.user) setStatus("signed-out");
          else setStatus(data.user.email_confirmed_at ? "authenticated" : "unverified");
        }).catch(() => {
          if (active) setStatus("signed-out");
        });
        const subscription = supabase.auth.onAuthStateChange((_event, session) => {
          if (!active) return;
          if (!session?.user) setStatus("signed-out");
          else setStatus(session.user.email_confirmed_at ? "authenticated" : "unverified");
        });
        unsubscribe = () => subscription.data.subscription.unsubscribe();
      })
      .catch(() => {
        if (active) setStatus("signed-out");
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (status === "signed-out" || status === "unverified") {
      const error = status === "unverified" ? "&error=email_not_confirmed" : "";
      router.replace(
        `/login?next=${encodeURIComponent(pathname || "/tenant-dashboard")}${error}`,
      );
    }
  }, [pathname, router, status]);

  if (status !== "authenticated") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7faf8] px-6 text-center">
        <p className="text-sm text-[#69736d]">Checking provider access…</p>
      </main>
    );
  }

  return children;
}
