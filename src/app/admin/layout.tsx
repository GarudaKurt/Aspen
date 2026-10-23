import type { ReactNode } from "react";
import { requireRole } from "@/server/auth/guard";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole("admin", "/admin/provider-applications");
  return children;
}
