import type { ReactNode } from "react";
import { DashboardShell } from "@/features/tenant-dashboard/components/dashboard-shell";

export default function TenantDashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
