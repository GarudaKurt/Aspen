import { reviewProviderApplication } from "@/features/admin/api/actions";
import { getProviderApplications } from "@/features/admin/api/queries";

export default async function ProviderApplicationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; reviewed?: string }>;
}) {
  const applications = await getProviderApplications();
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-10 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3c6355]">Admin control plane</p>
          <h1 className="mt-2 text-3xl font-bold">Provider applications</h1>
          <p className="mt-2 text-slate-500">Review business registrations independently from provider business management.</p>
        </header>

        {params?.error && <p role="alert" className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{params.error}</p>}
        {params?.reviewed && <p role="status" className="mb-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Application review saved.</p>}

        <div className="space-y-5">
          {applications.length ? applications.map((application) => (
            <article key={application.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col justify-between gap-4 lg:flex-row">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold">{application.businessName}</h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">{application.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{application.applicant?.display_name ?? "Unknown applicant"} · {application.applicant?.email ?? "No email"}</p>
                  <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-700">{application.businessDescription}</p>
                </div>
                <div className="shrink-0 text-sm text-slate-500">
                  <p>{application.providerType}</p>
                  <p className="mt-1">Submitted {new Date(application.submittedAt).toLocaleDateString("en-PH")}</p>
                </div>
              </div>

              <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-5 text-sm sm:grid-cols-3">
                <div><dt className="text-slate-400">Services</dt><dd className="mt-1 font-medium">{application.selectedServices.join(", ") || "None listed"}</dd></div>
                <div><dt className="text-slate-400">Experience</dt><dd className="mt-1 font-medium">{application.yearsExperience === null ? "Not provided" : `${application.yearsExperience} years`}</dd></div>
                <div>
                  <dt className="text-slate-400">Verification files</dt>
                  <dd className="mt-1 font-medium">
                    {application.identityDocuments.length ? (
                      <span className="flex flex-col gap-1">
                        {application.identityDocuments.map((document, index) => document.url ? (
                          <a key={`${document.label}-${index}`} href={document.url} target="_blank" rel="noreferrer" className="text-[#3c6355] underline">{document.label}</a>
                        ) : <span key={`${document.label}-${index}`}>{document.label} unavailable</span>)}
                      </span>
                    ) : "None linked"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Identity details</dt>
                  <dd className="mt-1 font-medium">
                    {application.identityDetails && typeof application.identityDetails === "object" && "fullName" in application.identityDetails
                      ? `${String(application.identityDetails.fullName || "Name not provided")} · ${String(application.identityDetails.idType || "ID type not provided")}`
                      : "Not provided"}
                  </dd>
                </div>
              </dl>

              {application.status === "pending" && (
                <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-end sm:justify-between">
                  <form action={reviewProviderApplication} className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-xl">
                    <input type="hidden" name="applicationId" value={application.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <label className="text-xs font-semibold text-slate-500" htmlFor={`reason-${application.id}`}>Rejection reason</label>
                    <input id={`reason-${application.id}`} name="rejectionReason" required maxLength={1000} placeholder="Explain what the applicant should correct." className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#3c6355] focus:ring-2 focus:ring-[#3c6355]/20" />
                    <button type="submit" className="w-fit rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Reject application</button>
                  </form>
                  <form action={reviewProviderApplication}>
                    <input type="hidden" name="applicationId" value={application.id} />
                    <input type="hidden" name="decision" value="approved" />
                    <button type="submit" className="w-full rounded-lg bg-[#3c6355] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2f5044] sm:w-auto">Approve and create provider business</button>
                  </form>
                </div>
              )}
            </article>
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No provider applications have been submitted.</div>
          )}
        </div>
      </div>
    </main>
  );
}
