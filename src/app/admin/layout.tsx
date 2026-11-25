import { Suspense, type ReactNode } from "react";
import { AdminApplicationsSkeleton } from "@/components/loading/dashboard-skeletons";
import { requireRole } from "@/server/auth/guard";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AdminApplicationsSkeleton />}>
      <AuthorizedAdmin>{children}</AuthorizedAdmin>
    </Suspense>
  );
}

async function AuthorizedAdmin({ children }: { children: ReactNode }) {
  await requireRole("admin", "/admin/provider-applications");
  return children;
}
