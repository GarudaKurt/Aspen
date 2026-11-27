import { Suspense, type ReactNode } from "react";
import { DashboardShellSkeleton } from "@/components/loading/dashboard-skeletons";
import { DashboardShell } from "@/features/tenant-dashboard/components/dashboard-shell";
import { ProviderAuthGuard } from "@/features/provider-auth/components/provider-auth-guard";
import { getDashboardBusiness } from "@/features/tenant-dashboard/overview-data";
import { requireRole } from "@/server/auth/guard";

export const dynamic = "force-dynamic";

export default function TenantDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<DashboardShellSkeleton />}>
      <AuthorizedDashboard>{children}</AuthorizedDashboard>
    </Suspense>
  );
}

async function AuthorizedDashboard({ children }: { children: ReactNode }) {
  const current = await requireRole("provider", "/tenant-dashboard");
  const { data: business } = await getDashboardBusiness();
  const businessName =
    business?.name?.trim() ||
    current.profile?.display_name?.trim() ||
    "Your business";

  return (
    <ProviderAuthGuard fallback={<DashboardShellSkeleton />}>
      <DashboardShell businessName={businessName}>{children}</DashboardShell>
    </ProviderAuthGuard>
  );
}
