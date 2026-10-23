import type { ReactNode } from "react";
import { DashboardShell } from "@/features/tenant-dashboard/components/dashboard-shell";
import { ProviderAuthGuard } from "@/features/provider-auth/components/provider-auth-guard";
import { requireRole } from "@/server/auth/guard";

export const dynamic = "force-dynamic";

export default async function TenantDashboardLayout({ children }: { children: ReactNode }) {
  await requireRole("provider", "/tenant-dashboard");
  return (
    <ProviderAuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </ProviderAuthGuard>
  );
}
