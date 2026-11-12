import "server-only";
import type { createSupabaseServerClient } from "@/lib/supabase/server-client";

/** Approval belongs to the business application, never to an individual service. */
export async function getServiceManagementAccess(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  businessId: string,
  userId: string,
): Promise<{ allowed: boolean; error: string }> {
  const { data: business, error } = await supabase.from("businesses").select("id, status")
    .eq("id", businessId).eq("owner_id", userId).maybeSingle();
  if (error) return { allowed: false, error: "Unable to check business access. Please try again." };
  if (!business) return { allowed: false, error: "You do not own this business." };
  if (!["pending", "published"].includes(business.status)) {
    return { allowed: false, error: "Service management is unavailable while this business is inactive or restricted. Contact support." };
  }
  const { data: application, error: approvalError } = await supabase.from("provider_applications")
    .select("id").eq("business_id", businessId).eq("applicant_id", userId).eq("status", "approved").limit(1).maybeSingle();
  if (approvalError) return { allowed: false, error: "Unable to verify business approval. Please try again." };
  if (!application) return { allowed: false, error: "Your business application must be approved before you can manage services." };
  return { allowed: true, error: "" };
}
