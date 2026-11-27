"use server";
import { z } from "zod";
import { planSchema } from "@/features/subscriptions/data/plans";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { requireRole } from "@/server/auth/guard";
import { getDashboardBusiness } from "@/features/tenant-dashboard/overview-data";
import { invalidatePublicCatalog } from "@/features/tenancy/api/catalog-invalidation";
import { enrollmentSchema, methodSchema, reviewSchema } from "../schemas";

export async function changePreference(form: FormData) {
  const { data: business } = await getDashboardBusiness();
  if (!business) redirect("/tenant-dashboard/billing?result=error");
  const method = methodSchema.safeParse(form.get("method"));
  const renew = form.get("renew");
  if (!method.success && renew !== "on" && renew !== "off")
    redirect("/tenant-dashboard/billing?result=invalid");
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("set_billing_preferences", {
    p_business: business.id,
    p_method: method.success ? method.data : null,
    p_renew: renew === "on" ? true : renew === "off" ? false : null,
  });
  if (error) redirect("/tenant-dashboard/billing?result=error");
  revalidatePath("/tenant-dashboard", "layout");
  redirect("/tenant-dashboard/billing?result=saved");
}
export async function enrollBusiness(form: FormData) {
  await requireRole("admin", "/admin/billing");
  const input = enrollmentSchema.safeParse({
    slug: form.get("slug"),
    plan: form.get("plan"),
    due: form.get("due") || null,
  });
  if (!input.success) redirect("/admin/billing?result=invalid");
  const db = await createSupabaseServerClient();
  const { data: business } = await db
    .from("businesses")
    .select("id")
    .eq("slug", input.data.slug)
    .maybeSingle();
  if (!business) redirect("/admin/billing?result=unknown");
  const { error } = await db.rpc("enroll_tenant_subscription", {
    p_business: business.id,
    p_plan: input.data.plan,
    p_due: input.data.due,
  });
  if (error) redirect("/admin/billing?result=enrollment_error");
  revalidatePath("/tenant-dashboard", "layout");
  redirect("/admin/billing?result=enrolled");
}
export async function reviewPayment(form: FormData) {
  await requireRole("admin", "/admin/billing");
  const input = reviewSchema.safeParse({
    id: form.get("id"),
    decision: form.get("decision"),
    reason: form.get("reason") ?? "",
  });
  if (!input.success) redirect("/admin/billing?result=invalid");
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("review_billing_payment", {
    p_id: input.data.id,
    p_approve: input.data.decision === "approve",
    p_feedback: input.data.reason,
  });
  if (error) redirect("/admin/billing?result=review_error");
  invalidatePublicCatalog();
  revalidatePath("/business-profile/[slug]", "layout");
  revalidatePath("/tenant-dashboard", "layout");
  revalidatePath("/admin/billing");
  revalidatePath("/admin/provider-applications");
  revalidatePath("/admin/notifications");
  redirect("/admin/billing?result=reviewed");
}

export async function changePlan(form: FormData) {
  await requireRole("admin", "/admin/billing");
  const input = z
    .object({
      slug: z.string().trim().min(1).max(180),
      plan: planSchema,
      due: z.string().date().nullable(),
    })
    .safeParse({
      slug: form.get("slug"),
      plan: form.get("plan"),
      due: form.get("due") || null,
    });
  if (!input.success) redirect("/admin/billing?result=invalid");
  const db = await createSupabaseServerClient();
  const business = await db
    .from("businesses")
    .select("id")
    .eq("slug", input.data.slug)
    .maybeSingle();
  if (!business.data) redirect("/admin/billing?result=unknown");
  const { error } = await db.rpc("change_renewal_plan", {
    p_business: business.data.id,
    p_plan: input.data.plan,
    p_first_due: input.data.due,
  });
  if (error) redirect("/admin/billing?result=change_error");
  invalidatePublicCatalog();
  revalidatePath("/tenant-dashboard", "layout");
  redirect("/admin/billing?result=changed");
}
