"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { getCurrentProfile } from "@/server/auth/session";
import { providerApplicationDecisionSchema } from "../schemas";

function redirectWithError(message: string): never {
  redirect(`/admin/provider-applications?error=${encodeURIComponent(message)}`);
}

export async function reviewProviderApplication(formData: FormData) {
  const current = await getCurrentProfile();
  if (!current?.user || current.profile?.role !== "admin") redirect("/");

  const parsed = providerApplicationDecisionSchema.safeParse({
    applicationId: formData.get("applicationId"),
    decision: formData.get("decision"),
    rejectionReason: formData.get("rejectionReason") ?? "",
  });
  if (!parsed.success) redirectWithError(parsed.error.issues[0]?.message ?? "The application decision is invalid.");

  const supabase = await createSupabaseServerClient();
  const result = parsed.data.decision === "approved"
    ? await supabase.rpc("approve_provider_application", { p_application_id: parsed.data.applicationId })
    : await supabase.rpc("reject_provider_application", {
        p_application_id: parsed.data.applicationId,
        p_rejection_reason: parsed.data.rejectionReason,
      });
  if (result.error) redirectWithError(result.error.message || "The application could not be reviewed.");

  revalidatePath("/admin/provider-applications");
  revalidatePath("/tenant-dashboard", "layout");
  redirect("/admin/provider-applications?reviewed=1");
}
