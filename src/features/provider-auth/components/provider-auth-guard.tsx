"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useProviderAuthStore } from "../provider-auth.store";

export function ProviderAuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { authenticated, hydrated, hydrate } = useProviderAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !authenticated) {
      router.replace(
        `/provider-login?next=${encodeURIComponent(pathname || "/tenant-dashboard")}`,
      );
    }
  }, [authenticated, hydrated, pathname, router]);

  if (!hydrated || !authenticated) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7faf8] px-6 text-center">
        <p className="text-sm text-[#69736d]">Checking provider access…</p>
      </main>
    );
  }

  return children;
}
