import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getDashboardBusiness } from "@/features/tenant-dashboard/overview-data";
import { getSubscription } from "../api/queries";
import { cycleState } from "../mappers";

export async function PaidWorkspace({ children }: { children: ReactNode }) {
  const business = await getDashboardBusiness();
  if (business.error) throw new Error("Could not verify your business.");
  if (business.data) {
    const { data, error } = await getSubscription(business.data.id);
    if (error) throw new Error("Could not verify billing access.");
    if (data && cycleState(data).suspended)
      redirect("/tenant-dashboard/billing");
  }
  return children;
}
