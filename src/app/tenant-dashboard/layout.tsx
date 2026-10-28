import type { ReactNode } from "react";
import { DashboardShell } from "@/features/tenant-dashboard/components/dashboard-shell";
import { ProviderAuthGuard } from "@/features/provider-auth/components/provider-auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { requireRole } from "@/server/auth/guard";

export const dynamic = "force-dynamic";

export default async function TenantDashboardLayout({ children }: { children: ReactNode }) {
  const current = await requireRole("provider", "/tenant-dashboard");
  const supabase = await createSupabaseServerClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("name")
    .eq("owner_id", current.user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const businessName = business?.name?.trim() || current.profile?.display_name?.trim() || "Your business";

  return (
    <ProviderAuthGuard>
      <DashboardShell businessName={businessName}>{children}</DashboardShell>
    </ProviderAuthGuard>
  );
}
