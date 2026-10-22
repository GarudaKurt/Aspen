import type { ReactNode } from "react";
import { DashboardShell } from "@/features/tenant-dashboard/components/dashboard-shell";
import { ProviderAuthGuard } from "@/features/provider-auth/components/provider-auth-guard";

export const dynamic = "force-dynamic";

export default function TenantDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProviderAuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </ProviderAuthGuard>
  );
}
