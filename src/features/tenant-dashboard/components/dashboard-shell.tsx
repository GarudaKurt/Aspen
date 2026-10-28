"use client";

import { AspenLogo } from "@/components/brand/aspen-logo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./dashboard-sidebar";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { clearListingDraft } from "@/features/business-profile/store/onboarding.store";

export function DashboardShell({ children, businessName }: { children: React.ReactNode; businessName: string }) {
  const router = useRouter();
  const logout = async () => {
    await getSupabaseBrowserClient().auth.signOut();
    clearListingDraft();
    router.replace("/");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-white text-[#171817]">
        <MobileDashboardHeader />
        <div className="mx-auto flex max-w-[1440px] 2xl:max-w-[1920px]">
          <DashboardSidebar businessName={businessName} onSignOut={logout} />
          <main id="dashboard-content" className="min-w-0 flex-1 bg-white p-5 sm:p-8 xl:p-10 2xl:p-14">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function MobileDashboardHeader() {
  const { open, setOpen } = useSidebar();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="provider-navigation"
        onClick={() => setOpen(!open)}
      >
        <Menu className="size-5" aria-hidden="true" />
      </Button>
      <Link href="/tenant-dashboard" className="inline-flex items-center gap-2 rounded-md text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3c6355]">
        <AspenLogo size={30} decorative />
        Aspen
      </Link>
    </header>
  );
}
