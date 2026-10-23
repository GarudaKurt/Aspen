import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { requireRole } from "@/server/auth/guard";
import { createR2DownloadUrl } from "@/lib/r2/client";

export async function getProviderApplications() {
  await requireRole("admin", "/admin/provider-applications");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("provider_applications")
    .select("id, applicant_id, status, provider_type, business_name, business_description, years_experience, location_details, selected_services, identity_details, identity_documents, review_notes, submitted_at, reviewed_at")
    .order("submitted_at", { ascending: false });
  if (error) throw new Error("Unable to load provider applications.");

  const applicantIds = (data ?? []).map((application) => String(application.applicant_id));
  const { data: profiles } = applicantIds.length
    ? await supabase.from("profiles").select("id, email, display_name").in("id", applicantIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((profile) => [String(profile.id), profile]));
  const applicationIds = (data ?? []).map((application) => String(application.id));
  const { data: mediaAssets } = applicationIds.length
    ? await supabase
        .from("media_assets")
        .select("id, provider_application_id, object_key, original_filename, status")
        .in("provider_application_id", applicationIds)
        .eq("category", "identity_document")
        .eq("status", "active")
    : { data: [] };
  const documentsByApplication = new Map<string, Array<{ label: string; url: string | null }>>();
  for (const asset of mediaAssets ?? []) {
    const applicationId = String(asset.provider_application_id);
    const url = await createR2DownloadUrl(String(asset.object_key)).catch(() => null);
    const documents = documentsByApplication.get(applicationId) ?? [];
    documents.push({ label: String(asset.original_filename ?? "Verification document"), url });
    documentsByApplication.set(applicationId, documents);
  }

  return Promise.all((data ?? []).map(async (application) => ({
    id: String(application.id),
    applicantId: String(application.applicant_id),
    applicant: profileById.get(String(application.applicant_id)) ?? null,
    status: String(application.status),
    providerType: String(application.provider_type),
    businessName: String(application.business_name),
    businessDescription: String(application.business_description),
    yearsExperience: application.years_experience === null ? null : Number(application.years_experience),
    locationDetails: application.location_details,
    selectedServices: Array.isArray(application.selected_services) ? application.selected_services.map(String) : [],
    identityDetails: application.identity_details,
    identityDocuments: documentsByApplication.get(String(application.id)) ?? [],
    reviewNotes: application.review_notes ? String(application.review_notes) : null,
    submittedAt: String(application.submitted_at),
    reviewedAt: application.reviewed_at ? String(application.reviewed_at) : null,
  })));
}
