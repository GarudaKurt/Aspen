"use client";

import { AspenLogo } from "@/components/brand/aspen-logo";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpenCheck,
  Building2,
  Check,
  CreditCard,
  ChevronLeft,
  FileCheck2,
  ShieldCheck,
  UserRound,
  CheckCircle2,
  ChevronDown,
  Loader2,
  MapPin,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { emailSchema } from "@/shared/schemas/contact.schema";
import {
  useListingStore,
  type BillingDetails,
  type IdentityDetails,
  type ListingDraft,
} from "@/features/business-profile/store/onboarding.store";
import { formatBusinessAddress } from "@/features/business-profile/location";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitProviderApplication } from "@/features/tenancy/api/actions";
import { providerApplicationSchema } from "@/features/tenancy/schemas";
import { linkApplicationMedia } from "@/features/media/api/actions";
import { uploadMediaFile } from "@/features/media/client";
import { AuthDialog } from "@/features/auth/components/auth-dialog";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import type { ProviderApplicationSummary } from "@/features/tenancy/types";

type ListingStep = {
  label: string;
  path: string;
  icon: LucideIcon;
};

const steps: ListingStep[] = [
  { label: "Business", path: "/list-your-business", icon: Building2 },
  {
    label: "Services",
    path: "/list-your-business/services",
    icon: ShieldCheck,
  },
  { label: "Identity", path: "/list-your-business/identity", icon: UserRound },
  { label: "Billing", path: "/list-your-business/billing", icon: CreditCard },
  { label: "Review", path: "/list-your-business/review", icon: BookOpenCheck },
];

const serviceOptions = [
  "Vet Clinics",
  "Pet supplies",
  "Grooming",
  "Boarding",
  "Training",
];

export function ListingPage({
  initialApplication,
}: {
  initialApplication?: ProviderApplicationSummary | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const providerType = useListingStore((state) => state.providerType);
  const setProviderType = useListingStore((state) => state.setProviderType);
  const businessName = useListingStore((state) => state.businessName);
  const businessDescription = useListingStore((state) => state.businessDescription);
  const yearsExperience = useListingStore((state) => state.yearsExperience);
  const facebookPage = useListingStore((state) => state.facebookPage);
  const locationDetails = useListingStore((state) => state.locationDetails);
  const setBusinessField = useListingStore((state) => state.setBusinessField);
  const setLocationField = useListingStore((state) => state.setLocationField);
  const selectedServices = useListingStore((state) => state.selectedServices);
  const toggleService = useListingStore((state) => state.toggleService);
  const identity = useListingStore((state) => state.identity);
  const setIdentityField = useListingStore((state) => state.setIdentityField);
  const identityFiles = useListingStore((state) => state.identityFiles);
  const setIdentityFile = useListingStore((state) => state.setIdentityFile);
  const uploadedFiles = useListingStore((state) => state.uploadedFiles);
  const setUploadedFile = useListingStore((state) => state.setUploadedFile);
  const billing = useListingStore((state) => state.billing);
  const setBillingField = useListingStore((state) => state.setBillingField);
  const [billingErrors, setBillingErrors] = useState<Record<string, string>>({});
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [authResolved, setAuthResolved] = useState(false);
  const [userRole, setUserRole] = useState<"customer" | "provider" | "admin" | null>(null);
  const [authenticatedUser, setAuthenticatedUser] = useState<{ email_confirmed_at?: string | null } | null>(null);
  const authPrompted = useRef(false);

  const activeIndex = Math.max(
    0,
    steps.findIndex(({ path }) => pathname === path),
  );

  const selectedPlan = searchParams.get("plan");
  const selectedPlanLabel = selectedPlan
    ? selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)
    : null;
  const registrationPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  const applicationInput = {
    providerType,
    businessName,
    businessDescription,
    yearsExperience: yearsExperience.trim() ? yearsExperience : null,
    facebookPage,
    locationDetails,
    selectedServices,
    identity,
    uploadedFiles,
    billing,
  };

  const reviewDraft: ListingDraft = {
    providerType,
    businessName,
    businessDescription,
    yearsExperience,
    facebookPage,
    locationDetails,
    selectedServices,
    identity,
    uploadedFiles,
    billing,
  };

  const withPlan = (path: string) =>
    selectedPlan ? `${path}?plan=${encodeURIComponent(selectedPlan)}` : path;

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let active = true;

    const syncUser = async (user: { id: string; email_confirmed_at?: string | null } | null) => {
      if (!active) return;
      setAuthenticatedUser(user);

      if (!user) {
        setUserRole(null);
        setAuthResolved(true);
        if (!authPrompted.current) {
          setAuthMode("signup");
          setAuthGateOpen(true);
          authPrompted.current = true;
        }
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;

      setUserRole(profile?.role ?? "customer");
      setAuthResolved(true);
      if (!user.email_confirmed_at && !authPrompted.current) {
        setAuthMode("login");
        setAuthGateOpen(true);
        authPrompted.current = true;
      }
    };

    void supabase.auth.getUser().then(({ data }) => syncUser(data.user)).catch(() => {
      if (!active) return;
      setAuthResolved(true);
      if (!authPrompted.current) {
        setAuthGateOpen(true);
        authPrompted.current = true;
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT") {
        authPrompted.current = false;
      }
      void syncUser(session?.user ?? null);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [registrationPath]);
  const goNext = () => {
    if (activeIndex === 3) {
      const nextErrors: Record<string, string> = {};
      if (!billing.fullName.trim()) nextErrors.fullName = "Billing name is required.";
      if (!billing.address.trim()) nextErrors.address = "Billing address is required.";
      const emailResult = emailSchema.safeParse(billing.email);
      if (!emailResult.success) {
        nextErrors.email = "Enter a valid billing email address.";
      }
      setBillingErrors(nextErrors);
      if (Object.keys(nextErrors).length) return;
    }
    router.push(withPlan(steps[Math.min(activeIndex + 1, steps.length - 1)].path));
  };

  const goBack = () => {
    router.push(activeIndex === 0 ? "/#browse" : withPlan(steps[activeIndex - 1].path));
  };

  const submitApplication = async () => {
    setSubmissionError("");
    const parsed = providerApplicationSchema.safeParse(applicationInput);
    if (!parsed.success) {
      setSubmissionError(parsed.error.issues[0]?.message ?? "Complete the required application details before submitting.");
      return;
    }

    const { data: authData } = await getSupabaseBrowserClient().auth.getUser();
    if (!authData.user?.email_confirmed_at) {
      setSubmissionError("Please sign in and verify your email before submitting your application.");
      setAuthGateOpen(true);
      return;
    }
    setAuthenticatedUser(authData.user);

    setSubmitting(true);
    const result = await submitProviderApplication(parsed.data);
    if (!result.ok) {
      setSubmitting(false);
      setSubmissionError(result.error);
      return;
    }

    try {
      const uploadedAssets = [];
      for (const file of Object.values(identityFiles)) {
        const asset = await uploadMediaFile(file, {
          providerApplicationId: result.id,
          category: "identity_document",
          visibility: "private",
        });
        uploadedAssets.push(asset.id);
      }
      if (uploadedAssets.length) {
        const linked = await linkApplicationMedia(result.id, uploadedAssets);
        if (!linked.ok) throw new Error(linked.error);
      }
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "The application was saved, but the identity files could not be uploaded.");
      setSubmitting(false);
      return;
    }
    useListingStore.getState().reset();
    setSubmitting(false);
    setSubmissionOpen(true);
  };

  const handleFile = (label: string, file?: File) => {
    if (file) {
      setUploadedFile(label, file.name);
      setIdentityFile(label, file);
    }
  };

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-[#171817] sm:px-8 sm:py-8 lg:px-12">
      <div className="mx-auto max-w-[1040px]">
        <header className="flex items-center justify-between border-b border-[#dededb] pb-5">
          <Link
            href="/#browse"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#242524] hover:text-[#3c6355]"
          >
            <ChevronLeft size={16} />
            Back
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 text-base font-medium tracking-wide">
            <AspenLogo size={28} decorative />
            <span>Aspen</span>
          </Link>
        </header>

        <div className="py-8 sm:py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c5714e]">
            Provider listing
          </p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            Tell us about your business
          </h1>
          <p className="mt-2 max-w-[560px] text-sm leading-5 text-[#777b78]">
            Start with the public identity customers will see. You can update
            these details from your provider profile after approval.
          </p>
          <p className="mt-3 text-sm font-semibold text-[#242524]">
            Step {activeIndex + 1} of {steps.length}
          </p>
          {selectedPlanLabel && (
            <p className="mt-2 inline-flex rounded-full bg-[#eef5f0] px-3 py-1 text-xs font-semibold text-[#3c6355]">
              Selected plan: {selectedPlanLabel} · Activation follows approval
            </p>
          )}

          {initialApplication && (
            <div
              className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
                initialApplication.status === "rejected"
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : initialApplication.status === "approved"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-[#cfe0d6] bg-[#f1f7f3] text-[#315447]"
              }`}
            >
              <p className="font-semibold">
                Your application for {initialApplication.businessName} is {initialApplication.status}.
              </p>
              {initialApplication.status === "pending" && (
                <p className="mt-1">Our team is reviewing your registration. You can return here to check for updates.</p>
              )}
              {initialApplication.status === "rejected" && (
                <>
                  <p className="mt-1">You can correct the information below and submit a new application.</p>
                  {initialApplication.reviewNotes && (
                    <p className="mt-2 rounded-lg bg-white/70 px-3 py-2">Reviewer note: {initialApplication.reviewNotes}</p>
                  )}
                </>
              )}
              {initialApplication.status === "approved" && (
                <p className="mt-1">
                  Your provider account is ready. <Link href="/tenant-dashboard" className="font-semibold underline">Open the Tenant Dashboard</Link>.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[150px_minmax(0,1fr)] lg:items-start">
          {!authResolved ? (
            <OnboardingAccessCard status="loading" />
          ) : !authenticatedUser?.email_confirmed_at ? (
            <OnboardingAccessCard
              status="guest"
              onCreateAccount={() => {
                setAuthMode("signup");
                setAuthGateOpen(true);
                authPrompted.current = true;
              }}
              onSignIn={() => {
                setAuthMode("login");
                setAuthGateOpen(true);
                authPrompted.current = true;
              }}
            />
          ) : userRole === "provider" ? (
            <OnboardingAccessCard status="provider" />
          ) : userRole === "admin" ? (
            <OnboardingAccessCard status="admin" />
          ) : initialApplication?.status === "approved" ? (
            <OnboardingAccessCard status="approved" />
          ) : initialApplication?.status === "pending" ? (
            <OnboardingAccessCard status="pending" />
          ) : (
            <>
          <ListingStepper activeIndex={activeIndex} plan={selectedPlan} />
          <Card className="rounded-xl border-[#d7d8d5] bg-white p-6 shadow-none sm:p-8">
            {activeIndex === 0 && (
              <BusinessStep
                providerType={providerType}
                onProviderTypeChange={setProviderType}
                businessName={businessName}
                businessDescription={businessDescription}
                yearsExperience={yearsExperience}
                facebookPage={facebookPage}
                locationDetails={locationDetails}
                onBusinessFieldChange={setBusinessField}
                onLocationFieldChange={setLocationField}
              />
            )}
            {activeIndex === 1 && (
              <ServicesStep
                selectedServices={selectedServices}
                onToggleService={toggleService}
              />
            )}
            {activeIndex === 2 && (
              <IdentityStep
                identity={identity}
                onIdentityFieldChange={setIdentityField}
                uploadedFiles={uploadedFiles}
                onFile={handleFile}
              />
            )}
            {activeIndex === 3 && (
              <BillingStep
                billing={billing}
                errors={billingErrors}
                onChange={(field, value) => {
                  setBillingErrors((current) => ({ ...current, [field]: "" }));
                  setBillingField(field, value);
                }}
              />
            )}
            {activeIndex === 4 && (
              <ReviewStep
                draft={reviewDraft}
                onEdit={(path) => router.push(withPlan(path))}
              />
            )}
            <div className="mt-10 flex flex-col gap-4 border-t border-[#e1e2df] pt-6 sm:mt-8 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="ghost"
                type="button"
                onClick={goBack}
                className="order-3 justify-start px-0 text-[#242524] hover:bg-transparent hover:text-[#3c6355] sm:order-none"
              >
                <ChevronLeft size={16} />
                {activeIndex === 0 ? "Back to search" : "Back"}
              </Button>
              <div className="order-1 flex w-full flex-col gap-3 sm:order-none sm:w-auto sm:flex-row">
                <Button
                  type="button"
                  onClick={
                    activeIndex === steps.length - 1
                      ? submitApplication
                      : goNext
                  }
                  className="order-1 min-h-11 w-full px-4 sm:order-none sm:w-40 bg-[#3c6355] text-white hover:bg-[#2f5044]"
                  disabled={submitting}
                >
                  {activeIndex === steps.length - 1
                    ? submitting ? "Submitting…" : "Submit application"
                    : "Save and continue"}
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => router.push("/")}
                  className="order-2 min-h-11 w-full px-4 sm:order-none sm:w-40 border-[#cfd2cf] bg-white"
                >
                  Save and exit
                </Button>
              </div>
            </div>
            {submissionError && (
              <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {submissionError}
              </p>
            )}
          </Card>
            </>
          )}
        </div>
      </div>
      <Dialog open={submissionOpen} onOpenChange={setSubmissionOpen}>
        <DialogContent className="max-w-md p-6 sm:p-8">
          <DialogClose onClick={() => setSubmissionOpen(false)} />
          <div className="flex flex-col items-center text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-[#eef7f1] text-[#3c6355]">
              <CheckCircle2 className="size-7" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-bold text-[#171817]">
              Application Submitted Successfully!
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#69736d]">
              Thank you for submitting your business verification application.
              Your application is currently under review by our administration
              team. The verification process typically takes 1–3 business days.
            </p>
            <p className="mt-3 text-sm leading-6 text-[#69736d]">
              Please check your registered email regularly for updates regarding
              your application&apos;s approval status.
            </p>
            <Button
              type="button"
              onClick={() => setSubmissionOpen(false)}
              className="mt-6 min-h-11 w-full bg-[#3c6355] text-white hover:bg-[#2f5044] sm:w-40"
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <AuthDialog
        open={authGateOpen}
        onOpenChange={setAuthGateOpen}
        initialMode={authMode}
        redirectPath={registrationPath}
        notice={
          authenticatedUser && !authenticatedUser.email_confirmed_at
            ? { message: "Please verify your email address before continuing your provider registration.", variant: "error" }
            : undefined
        }
        compact
        onSubmitSuccess={() => {
          setAuthGateOpen(false);
          setSubmissionError("");
          router.refresh();
        }}
      />
    </main>
  );
}

function OnboardingAccessCard({
  status,
  onCreateAccount,
  onSignIn,
}: {
  status: "loading" | "guest" | "provider" | "admin" | "pending" | "approved";
  onCreateAccount?: () => void;
  onSignIn?: () => void;
}) {
  if (status === "loading") {
    return (
      <Card className="lg:col-span-2 rounded-2xl border-[#d7d8d5] bg-white p-8 text-center shadow-none sm:p-12">
        <Loader2 className="mx-auto size-7 animate-spin text-[#3c6355]" aria-hidden="true" />
        <p className="mt-4 text-sm text-[#69736d]">Preparing your business registration…</p>
      </Card>
    );
  }

  if (status === "provider") {
    return (
      <Card className="lg:col-span-2 rounded-2xl border-[#cfe0d6] bg-[#f5faf6] p-8 shadow-none sm:p-12">
        <div className="mx-auto max-w-xl text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#dcece2] text-[#3c6355]">
            <Building2 className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-xl font-bold text-[#315447]">Your business workspace is ready</h2>
          <p className="mt-2 text-sm leading-6 text-[#69736d]">
            This account already has provider access. Open your Tenant Dashboard to manage your business, services, and appointments.
          </p>
          <Link
            href="/tenant-dashboard"
            className="mt-6 inline-flex min-h-9 items-center justify-center rounded-lg bg-[#3c6355] px-3 text-sm font-medium text-white transition-colors hover:bg-[#2f5044] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#3c6355]/40"
          >
            Open Tenant Dashboard
          </Link>
        </div>
      </Card>
    );
  }

  if (status === "admin") {
    return (
      <Card className="lg:col-span-2 rounded-2xl border-[#d7d8d5] bg-white p-8 text-center shadow-none sm:p-12">
        <ShieldCheck className="mx-auto size-10 text-[#3c6355]" aria-hidden="true" />
        <h2 className="mt-4 text-xl font-bold">Admin account</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#69736d]">
          Admin accounts review provider applications and cannot submit a provider registration through this workflow.
        </p>
      </Card>
    );
  }

  if (status === "pending") {
    return (
      <Card className="lg:col-span-2 rounded-2xl border-[#cfe0d6] bg-[#f5faf6] p-8 text-center shadow-none sm:p-12">
        <FileCheck2 className="mx-auto size-10 text-[#3c6355]" aria-hidden="true" />
        <h2 className="mt-4 text-xl font-bold text-[#315447]">Your application is under review</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#69736d]">
          We already have your business registration. Our administration team will review it and update you when a decision is available.
        </p>
        <p className="mt-4 text-xs text-[#88918b]">You can return to this page later to check the application status.</p>
      </Card>
    );
  }

  if (status === "approved") {
    return (
      <Card className="lg:col-span-2 rounded-2xl border-emerald-200 bg-emerald-50 p-8 text-center shadow-none sm:p-12">
        <CheckCircle2 className="mx-auto size-10 text-emerald-700" aria-hidden="true" />
        <h2 className="mt-4 text-xl font-bold text-emerald-900">Your business is approved</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-emerald-900/75">
          Your provider workspace is ready. Continue in the Tenant Dashboard to manage your business and services.
        </p>
        <Link
          href="/tenant-dashboard"
          className="mt-6 inline-flex min-h-9 items-center justify-center rounded-lg bg-[#3c6355] px-3 text-sm font-medium text-white transition-colors hover:bg-[#2f5044] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#3c6355]/40"
        >
          Open Tenant Dashboard
        </Link>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-2 rounded-2xl border-[#cfe0d6] bg-[#f8fbf9] p-8 shadow-none sm:p-12">
      <div className="mx-auto max-w-xl text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#dcece2] text-[#3c6355]">
          <UserRound className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#c5714e]">One account, two ways to grow</p>
        <h2 className="mt-2 text-xl font-bold text-[#315447] sm:text-2xl">Create your provider account first</h2>
        <p className="mt-3 text-sm leading-6 text-[#69736d]">
          Sign in or create an Aspen account before entering your business details. Your account lets you save this application, upload private documents securely, and manage your business after approval.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button type="button" onClick={onCreateAccount} className="min-h-11 bg-[#3c6355] text-white hover:bg-[#2f5044]">
            Create an account
          </Button>
          <Button type="button" variant="outline" onClick={onSignIn} className="min-h-11 border-[#3c6355] text-[#3c6355] hover:bg-white">
            I already have an account
          </Button>
        </div>
        <p className="mt-5 text-xs text-[#88918b]">Your registration progress will remain available while you complete authentication.</p>
      </div>
    </Card>
  );
}

function ListingStepper({ activeIndex, plan }: { activeIndex: number; plan: string | null }) {
  return (
    <nav
      aria-label="Listing progress"
      className="w-full max-w-full overflow-hidden pb-2 lg:overflow-visible"
    >
      <ol className="flex w-full items-start justify-between gap-0 lg:block lg:min-w-0">
        {steps.map(({ label, path, icon: Icon }, index) => {
          const isCurrent = index === activeIndex;
          const isComplete = index < activeIndex;
          const isReached = index <= activeIndex;
          const hasNext = index < steps.length - 1;

          return (
            <li
              key={label}
              className="relative flex min-w-0 flex-1 items-start lg:block lg:pb-6"
            >
              <Link
                href={plan ? `${path}?plan=${encodeURIComponent(plan)}` : path}
                aria-current={isCurrent ? "step" : undefined}
                className={`group relative z-10 flex min-w-0 flex-1 flex-col items-center gap-1 text-center text-[10px] sm:gap-2 sm:text-xs lg:flex-row lg:items-center lg:gap-2 lg:text-left ${isReached ? "text-[#3c6355]" : "text-[#a0a4a1]"}`}
              >
                <span
                  className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 bg-white transition-colors duration-200 sm:size-9 ${isCurrent ? "border-[#3c6355] text-[#3c6355] ring-4 ring-[#3c6355]/10" : isComplete ? "border-emerald-600 bg-emerald-50 text-emerald-600" : "border-[#cfd2cf] text-[#a0a4a1]"}`}
                >
                  {isComplete ? (
                    <Check size={14} strokeWidth={2.5} className="sm:size-4" />
                  ) : (
                    <Icon size={14} className="sm:size-4" />
                  )}
                </span>
                <span className="mt-1 block min-w-0 max-w-[4.5rem] truncate sm:mt-0 sm:max-w-none lg:text-left">
                  <span className="block truncate font-semibold">{label}</span>
                  <span className="hidden text-[9px] text-[#a0a4a1] sm:block">
                    {isCurrent
                      ? "Current step"
                      : isComplete
                        ? "Completed"
                        : "Not selected yet"}
                  </span>
                </span>
              </Link>
              {hasNext && (
                <span
                  aria-hidden="true"
                  className={`absolute z-0 bg-[#cfd2cf] transition-colors duration-200 ${isComplete ? "bg-emerald-600" : ""} left-[calc(50%+16px)] right-[-50%] top-4 h-0.5 sm:left-[calc(50%+18px)] sm:top-4 lg:left-4 lg:right-auto lg:top-9 lg:h-auto lg:w-0.5 lg:-translate-x-1/2 lg:bottom-0`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function BusinessStep({
  providerType,
  onProviderTypeChange,
  businessName,
  businessDescription,
  yearsExperience,
  facebookPage,
  locationDetails,
  onBusinessFieldChange,
  onLocationFieldChange,
}: {
  providerType: string;
  onProviderTypeChange: (value: string) => void;
  businessName: string;
  businessDescription: string;
  yearsExperience: string;
  facebookPage: string;
  locationDetails: import("@/features/business-profile/location").BusinessLocationDetails;
  onBusinessFieldChange: (field: "businessName" | "businessDescription" | "yearsExperience" | "facebookPage", value: string) => void;
  onLocationFieldChange: <K extends keyof import("@/features/business-profile/location").BusinessLocationDetails>(field: K, value: import("@/features/business-profile/location").BusinessLocationDetails[K]) => void;
}) {
  return (
    <FormSection
      title="Business information"
      description="Share the public details customers will see."
    >
      <FieldLabel label="Provider type">
        <div className="grid gap-3 sm:grid-cols-2">
          {["Individual provider", "Registered business"].map((type) => (
            <Button
              key={type}
              variant="outline"
              type="button"
              onClick={() => onProviderTypeChange(type)}
              aria-pressed={providerType === type}
              className={`justify-start rounded-lg bg-white text-left font-normal ${providerType === type ? "border-[#3c6355] text-[#3c6355]" : "border-[#d2d5d2] text-[#242524]"}`}
            >
              <span
                className={`size-4 rounded-full border ${providerType === type ? "border-[#3c6355] bg-[#3c6355] shadow-[inset_0_0_0_3px_white]" : "border-[#529dff]"}`}
              />
              {type}
            </Button>
          ))}
        </div>
      </FieldLabel>
      <FieldLabel label="Business or display name">
        <Input value={businessName} onChange={(event) => onBusinessFieldChange("businessName", event.target.value)} placeholder="e.g. Kalinga Animal Hospital" />
      </FieldLabel>
      <FieldLabel
        label="Business description"
        hint="Describe your experience and what makes your service distinctive."
      >
        <textarea value={businessDescription} onChange={(event) => onBusinessFieldChange("businessDescription", event.target.value)} className="min-h-24 w-full resize-none rounded-lg border border-[#d2d5d2] bg-white px-3 py-2 text-sm outline-none focus:border-[#3c6355] focus:ring-2 focus:ring-[#3c6355]/20" />
      </FieldLabel>
      <LocationFields
        locationDetails={locationDetails}
        onLocationFieldChange={onLocationFieldChange}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldLabel label="Years of experience" hint="Optional">
          <Input type="number" min="0" value={yearsExperience} onChange={(event) => onBusinessFieldChange("yearsExperience", event.target.value)} placeholder="e.g. 4" />
        </FieldLabel>
        <FieldLabel label="Facebook page" hint="Optional">
          <Input value={facebookPage} onChange={(event) => onBusinessFieldChange("facebookPage", event.target.value)} placeholder="https://facebook.com/your-business" />
        </FieldLabel>
      </div>
    </FormSection>
  );
}

type LocationOption = {
  code: string;
  name: string;
  type?: string;
};

type AddressResult = {
  id: number;
  label: string;
  coordinates: [number, number];
  type?: string;
};

function LocationFields({
  locationDetails,
  onLocationFieldChange,
}: {
  locationDetails: import("@/features/business-profile/location").BusinessLocationDetails;
  onLocationFieldChange: <K extends keyof import("@/features/business-profile/location").BusinessLocationDetails>(
    field: K,
    value: import("@/features/business-profile/location").BusinessLocationDetails[K],
  ) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <AdministrativeLocationField
          key={`province-${locationDetails.province}`}
          label="Province"
          placeholder="Search province"
          level="provinces"
          value={locationDetails.province}
          onChange={(value) => {
            onLocationFieldChange("province", value);
            onLocationFieldChange("cityMunicipality", "");
            onLocationFieldChange("barangay", "");
          }}
        />
        <AdministrativeLocationField
          key={`city-${locationDetails.province}`}
          label="City / Municipality"
          placeholder="Search city or municipality"
          level="cities"
          parent={locationDetails.province}
          value={locationDetails.cityMunicipality}
          disabled={!locationDetails.province}
          onChange={(value) => {
            onLocationFieldChange("cityMunicipality", value);
            onLocationFieldChange("barangay", "");
          }}
        />
        <AdministrativeLocationField
          key={`barangay-${locationDetails.cityMunicipality}`}
          label="Barangay"
          placeholder="Search barangay"
          level="barangays"
          parent={locationDetails.cityMunicipality}
          value={locationDetails.barangay}
          disabled={!locationDetails.cityMunicipality}
          onChange={(value) => onLocationFieldChange("barangay", value)}
        />
        <StreetAddressField
          locationDetails={locationDetails}
          onLocationFieldChange={onLocationFieldChange}
        />
      </div>
      <p className="text-xs leading-5 text-[#777b78]">
        Select the official administrative areas first. Street address is entered manually and can be checked against map data when available.
      </p>
    </div>
  );
}

function AdministrativeLocationField({
  label,
  placeholder,
  level,
  parent,
  value,
  disabled,
  onChange,
}: {
  label: string;
  placeholder: string;
  level: "provinces" | "cities" | "barangays";
  parent?: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<LocationOption[]>([]);
  const [open, setOpen] = useState(false);
  const shouldLoad = !disabled && (level === "provinces" || Boolean(parent));
  const [loading, setLoading] = useState(shouldLoad);
  const [error, setError] = useState("");

  useEffect(() => {
    if (disabled || (level !== "provinces" && !parent)) {
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams({ level });
    if (parent) params.set(level === "cities" ? "province" : "city", parent);

    fetch(`/api/locations?${params.toString()}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Unable to load locations.");
        return payload as LocationOption[];
      })
      .then((items) => {
        if (!cancelled) setOptions(items);
      })
      .catch((reason: Error) => {
        if (!cancelled) setError(reason.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [disabled, level, parent]);

  const filteredOptions = options
    .filter((option) => option.name.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 80);

  return (
    <div className="relative space-y-2 text-sm font-semibold">
      <span>{label}</span>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#777b78]" aria-hidden="true" />
        <Input
          value={query}
          disabled={disabled}
          placeholder={disabled ? `Select ${level === "cities" ? "a province" : "a city first"}` : placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${level}-options`}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter" && filteredOptions[0]) {
              event.preventDefault();
              onChange(filteredOptions[0].name);
              setQuery(filteredOptions[0].name);
              setOpen(false);
            }
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          className="h-11 pl-9 pr-9 rounded-lg border-[#d2d5d2] focus-visible:border-[#3c6355] focus-visible:ring-[#3c6355]/20"
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#777b78]" aria-hidden="true" />
      </div>
      {open && !disabled && (
        <div id={`${level}-options`} role="listbox" className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-[#d2d5d2] bg-white p-1 shadow-lg">
          {loading && <p className="flex items-center gap-2 px-3 py-3 text-xs font-normal text-[#777b78]"><Loader2 className="size-4 animate-spin" /> Loading locations…</p>}
          {!loading && error && <p className="px-3 py-3 text-xs font-normal text-red-600">{error}</p>}
          {!loading && !error && filteredOptions.length === 0 && <p className="px-3 py-3 text-xs font-normal text-[#777b78]">No matching {label.toLowerCase()} found.</p>}
          {!loading && !error && filteredOptions.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option.name === value}
              key={option.code}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(option.name);
                setQuery(option.name);
                setOpen(false);
              }}
              className="flex w-full items-start rounded-md px-3 py-2 text-left text-sm font-normal text-[#242524] hover:bg-[#f1f6f3] focus:bg-[#f1f6f3] focus:outline-none"
            >
              {option.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StreetAddressField({
  locationDetails,
  onLocationFieldChange,
}: {
  locationDetails: import("@/features/business-profile/location").BusinessLocationDetails;
  onLocationFieldChange: <K extends keyof import("@/features/business-profile/location").BusinessLocationDetails>(
    field: K,
    value: import("@/features/business-profile/location").BusinessLocationDetails[K],
  ) => void;
}) {
  const [results, setResults] = useState<AddressResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const searchAddress = async () => {
    const parts = [locationDetails.streetAddress, locationDetails.barangay, locationDetails.cityMunicipality, locationDetails.province].filter(Boolean);
    if (parts.length < 2) {
      setMessage("Add a street and city or municipality before searching.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/geocode/address?q=${encodeURIComponent(parts.join(", "))}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Address search failed.");
      setResults(payload as AddressResult[]);
      if (!payload.length) setMessage("No precise map match was found. You can still save the address and verify it later.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Address search failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 text-sm font-semibold">
      <span>Street address</span>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={locationDetails.streetAddress}
          onChange={(event) => {
            onLocationFieldChange("streetAddress", event.target.value);
            setResults([]);
            setMessage("");
          }}
          placeholder="e.g. Colon Street"
          className="h-11 rounded-lg border-[#d2d5d2] focus-visible:border-[#3c6355] focus-visible:ring-[#3c6355]/20"
        />
        <Button type="button" variant="outline" onClick={searchAddress} disabled={loading} className="h-11 shrink-0 border-[#d2d5d2]">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <MapPin className="size-4" />}
          Find on map
        </Button>
      </div>
      {results.length > 0 && (
        <div className="space-y-1 rounded-lg border border-[#d2d5d2] bg-white p-1">
          <p className="px-3 py-2 text-xs font-normal text-[#777b78]">Choose the closest verified match:</p>
          {results.map((result) => (
            <button
              type="button"
              key={result.id}
              onClick={() => {
                onLocationFieldChange("coordinates", result.coordinates);
                setResults([]);
                setMessage("Map location selected.");
              }}
              className="flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-xs font-normal text-[#242524] hover:bg-[#f1f6f3]"
            >
              <MapPin className="mt-0.5 size-4 shrink-0 text-[#3c6355]" />
              <span className="break-words">{result.label}</span>
            </button>
          ))}
        </div>
      )}
      {message && <p className="text-xs font-normal text-[#777b78]">{message}</p>}
      {locationDetails.coordinates && <p className="text-xs font-normal text-[#3c6355]">Map location selected from address search.</p>}
    </div>
  );
}

function ServicesStep({
  selectedServices,
  onToggleService,
}: {
  selectedServices: string[];
  onToggleService: (service: string) => void;
}) {
  return (
    <FormSection
      title="Service categories"
      description="Select one or more categories."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {serviceOptions.map((service) => (
          <Button
            key={service}
            variant="outline"
            type="button"
            aria-pressed={selectedServices.includes(service)}
            onClick={() => onToggleService(service)}
            className={`justify-start rounded-lg bg-white font-normal ${selectedServices.includes(service) ? "border-[#3c6355] text-[#3c6355]" : "border-[#d2d5d2] text-[#242524]"}`}
          >
            <span
              className={`flex size-4 items-center justify-center rounded-sm border ${selectedServices.includes(service) ? "border-[#3c6355] bg-[#3c6355] text-white" : "border-[#b8bdb9]"}`}
            >
              {selectedServices.includes(service) && <Check size={12} />}
            </span>
            {service}
          </Button>
        ))}
      </div>
      <p className="text-sm leading-5 text-[#777b78]">
        Choose the categories that best describe the services your business offers. You can add individual services and pricing from your provider dashboard.
      </p>
    </FormSection>
  );
}

function IdentityStep({
  identity,
  onIdentityFieldChange,
  uploadedFiles,
  onFile,
}: {
  identity: IdentityDetails;
  onIdentityFieldChange: <K extends keyof IdentityDetails>(
    field: K,
    value: IdentityDetails[K],
  ) => void;
  uploadedFiles: Record<string, string>;
  onFile: (label: string, file?: File) => void;
}) {
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  const isValidMobileNumber = /^(?:\+63|63|0)9\d{9}$/.test(
    identity.contactNumber.replace(/[\s()-]/g, ""),
  );

  const sendCode = () => {
    if (!isValidMobileNumber) return;
    setSendingCode(true);
    onIdentityFieldChange("verificationStatus", "idle");
    window.setTimeout(() => {
      setCodeSent(true);
      setSendingCode(false);
    }, 450);
  };

  const verifyCode = () => {
    onIdentityFieldChange(
      "verificationStatus",
      verificationCode === "1234" ? "verified" : "invalid",
    );
  };

  return (
    <FormSection
      title="Verify your identity"
      description="Your identity documents are private and available only to you and authorized administrators during this demo review."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldLabel label="Full name">
          <Input
            value={identity.fullName}
            onChange={(event) => onIdentityFieldChange("fullName", event.target.value)}
            placeholder="Your legal name"
          />
        </FieldLabel>
        <FieldLabel label="Government ID type">
          <Select
            value={identity.idType}
            onValueChange={(value) => {
              if (value) onIdentityFieldChange("idType", value);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="National ID">National ID</SelectItem>
              <SelectItem value="Passport">Passport</SelectItem>
              <SelectItem value="Driver&apos;s license">Driver&apos;s license</SelectItem>
              <SelectItem value="SSS ID">SSS ID</SelectItem>
              <SelectItem value="PRC ID">PRC ID</SelectItem>
            </SelectContent>
          </Select>
        </FieldLabel>
      </div>
      <Card className="rounded-lg border-[#d8dbd8] p-3 shadow-none">
        <FieldLabel label="Contact number">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={identity.contactNumber}
              onChange={(event) => {
                onIdentityFieldChange("contactNumber", event.target.value);
                setCodeSent(false);
                onIdentityFieldChange("verificationStatus", "idle");
              }}
              placeholder="+63 900 000 0000"
              inputMode="tel"
              aria-invalid={identity.contactNumber.length > 0 && !isValidMobileNumber}
            />
            <Button
              type="button"
              variant="outline"
              onClick={sendCode}
              disabled={!isValidMobileNumber || sendingCode}
              className="shrink-0 sm:min-w-28"
            >
              {sendingCode ? "Sending…" : codeSent ? "Resend code" : "Send code"}
            </Button>
          </div>
          {identity.contactNumber.length > 0 && !isValidMobileNumber && (
            <span className="block text-xs font-normal text-red-600">
              Enter a valid Philippine mobile number.
            </span>
          )}
        </FieldLabel>
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ${codeSent ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
          aria-hidden={!codeSent}
        >
          <div className="min-h-0 overflow-hidden">
            <FieldLabel label="Four-digit verification code">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={verificationCode}
                  onChange={(event) => {
                    setVerificationCode(
                      event.target.value.replace(/\D/g, "").slice(0, 4),
                    );
                    onIdentityFieldChange("verificationStatus", "idle");
                  }}
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="1234"
                  aria-describedby="mock-verification-note"
                  disabled={!codeSent}
                />
                <Button
                  type="button"
                  onClick={verifyCode}
                  disabled={
                    !codeSent ||
                    verificationCode.length !== 4 ||
                    identity.verificationStatus === "verified"
                  }
                  className="bg-[#2768f5] text-white hover:bg-[#1d55d1] sm:min-w-24"
                >
                  {identity.verificationStatus === "verified" ? "Verified" : "Verify"}
                </Button>
              </div>
              <span
                id="mock-verification-note"
                className="block text-xs font-normal text-[#69736d]"
              >
                Mock verification: use code 1234. No SMS is sent yet.
              </span>
              {identity.verificationStatus === "invalid" && (
                <span className="block text-xs font-normal text-red-600">
                  That code is incorrect. Check the code and try again.
                </span>
              )}
              {identity.verificationStatus === "verified" && (
                <span className="block text-xs font-normal text-[#3c6355]">
                  Contact number verified successfully.
                </span>
              )}
            </FieldLabel>
          </div>
        </div>
        {identity.verificationStatus === "verified" && !codeSent && (
          <span className="block text-xs font-normal text-[#3c6355]">
            Contact number verified successfully.
          </span>
        )}
      </Card>
      {["Government ID", "Business Permit"].map((label) => (
        <FileUpload
          key={label}
          label={label}
          fileName={uploadedFiles[label]}
          onFile={(file) => onFile(label, file)}
        />
      ))}
    </FormSection>
  );
}

function BillingStep({
  billing,
  errors,
  onChange,
}: {
  billing: BillingDetails;
  errors: Record<string, string>;
  onChange: <K extends keyof BillingDetails>(
    field: K,
    value: BillingDetails[K],
  ) => void;
}) {
  return (
    <FormSection
      title="Billing details"
      description="Provide the billing information we will use for your provider account."
    >
      <div className="rounded-lg border border-[#d8dbd8] bg-[#f7faf8] p-4 text-sm text-[#587267]">
        No payment is collected in this step. Billing and plan activation will be
        finalized after your listing is reviewed.
      </div>
      <FieldLabel label="Billing name">
        <Input
          value={billing.fullName}
          onChange={(event) => onChange("fullName", event.target.value)}
          placeholder="Your full name or registered business name"
          aria-invalid={Boolean(errors.fullName)}
        />
        {errors.fullName && (
          <span className="block text-xs font-normal text-red-600">{errors.fullName}</span>
        )}
      </FieldLabel>
      <FieldLabel label="Billing email">
        <Input
          type="email"
          value={billing.email}
          onChange={(event) => onChange("email", event.target.value)}
          placeholder="billing@example.com"
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email && (
          <span className="block text-xs font-normal text-red-600">{errors.email}</span>
        )}
      </FieldLabel>
      <FieldLabel label="Billing address">
        <textarea
          value={billing.address}
          onChange={(event) => onChange("address", event.target.value)}
          placeholder="Street, city, province"
          aria-invalid={Boolean(errors.address)}
          className="min-h-24 w-full resize-none rounded-lg border border-[#d2d5d2] bg-white px-3 py-2 text-sm outline-none focus:border-[#3c6355] focus:ring-2 focus:ring-[#3c6355]/20"
        />
        {errors.address && (
          <span className="block text-xs font-normal text-red-600">{errors.address}</span>
        )}
      </FieldLabel>
      <FieldLabel label="Billing preference">
        <Select
          value={billing.method}
          onValueChange={(value) =>
            onChange("method", value as BillingDetails["method"])
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="invoice">Invoice after approval</SelectItem>
            <SelectItem value="online">Pay online when billing is enabled</SelectItem>
          </SelectContent>
        </Select>
      </FieldLabel>
    </FormSection>
  );
}

function ReviewStep({
  draft,
  onEdit,
}: {
  draft: ListingDraft;
  onEdit: (path: string) => void;
}) {
  const location = formatBusinessAddress(
    draft.locationDetails,
    "Location not completed",
  );
  const yearsExperience = draft.yearsExperience.trim()
    ? `${draft.yearsExperience.trim()} year${draft.yearsExperience.trim() === "1" ? "" : "s"}`
    : "Not provided";
  const identityStatus =
    draft.identity.verificationStatus === "verified"
      ? "Verified"
      : draft.identity.contactNumber
        ? "Not verified"
        : "Not provided";
  const documents = Object.entries(draft.uploadedFiles);

  return (
    <FormSection
      title="Review and submit"
      description="Check every section before sending the application to the administrator."
    >
      <ReviewCard title="Business" onEdit={() => onEdit("/list-your-business")}>
        <ReviewRow label="Provider type" value={draft.providerType || "Not provided"} />
        <ReviewRow label="Business name" value={draft.businessName || "Not provided"} />
        <ReviewRow label="Description" value={draft.businessDescription || "Not provided"} multiline />
        <ReviewRow label="Location" value={location} multiline />
        <ReviewRow label="Landmark" value={draft.locationDetails.landmark || "Not provided"} multiline />
        <ReviewRow label="Additional details" value={draft.locationDetails.additionalDetails || "Not provided"} multiline />
        <ReviewRow label="Experience" value={yearsExperience} />
        <ReviewRow label="Facebook page" value={draft.facebookPage || "Not provided"} multiline />
        <ReviewRow
          label="Map location"
          value={draft.locationDetails.coordinates ? "Map pin selected" : "Not selected"}
        />
      </ReviewCard>

      <ReviewCard title="Services" onEdit={() => onEdit("/list-your-business/services")}>
        <ReviewRow
          label="Categories"
          value={draft.selectedServices.length ? draft.selectedServices.join(", ") : "No services selected"}
          multiline
        />
      </ReviewCard>

      <ReviewCard title="Identity" onEdit={() => onEdit("/list-your-business/identity")}>
        <ReviewRow label="Legal name" value={draft.identity.fullName || "Not provided"} />
        <ReviewRow label="Government ID" value={draft.identity.idType || "Not provided"} />
        <ReviewRow label="Contact number" value={draft.identity.contactNumber || "Not provided"} />
        <ReviewRow label="Contact verification" value={identityStatus} />
        <ReviewRow
          label="Documents"
          value={
            documents.length ? (
              <ul className="space-y-1">
                {documents.map(([label, fileName]) => (
                  <li key={label}>
                    <span className="font-medium text-[#3c6355]">{label}:</span> {fileName}
                  </li>
                ))}
              </ul>
            ) : (
              "No documents uploaded"
            )
          }
          multiline
        />
      </ReviewCard>

      <ReviewCard title="Billing" onEdit={() => onEdit("/list-your-business/billing")}>
        <ReviewRow label="Billing name" value={draft.billing.fullName || "Not provided"} />
        <ReviewRow label="Billing email" value={draft.billing.email || "Not provided"} />
        <ReviewRow label="Billing address" value={draft.billing.address || "Not provided"} multiline />
        <ReviewRow
          label="Preference"
          value={draft.billing.method === "online" ? "Pay online when billing is enabled" : "Invoice after approval"}
          multiline
        />
      </ReviewCard>
    </FormSection>
  );
}

function ReviewCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-lg border-[#d8dbd8] p-4 shadow-none">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        <Button
          variant="ghost"
          type="button"
          onClick={onEdit}
          className="text-[#3c6355]"
        >
          Edit
        </Button>
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        {children}
      </dl>
    </Card>
  );
}

function ReviewRow({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: ReactNode;
  multiline?: boolean;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <dt className="font-medium text-[#69736d]">{label}</dt>
      <dd className={`min-w-0 break-words text-[#242524] ${multiline ? "leading-6" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function FileUpload({
  label,
  fileName,
  onFile,
}: {
  label: string;
  fileName?: string;
  onFile: (file?: File) => void;
}) {
  return (
    <FieldLabel label={label} hint="Optional">
      <label className="flex cursor-pointer items-center justify-between rounded-lg border border-[#d2d5d2] px-3 py-3">
        <span className="flex items-center gap-2 text-sm text-[#777b78]">
          <FileCheck2 size={18} />
          {fileName ?? "No document selected"}
        </span>
        <span className="rounded-md border border-[#cfd2cf] px-3 py-1.5 text-xs font-semibold">
          Upload file
        </span>
        <input
          type="file"
          className="sr-only"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={(event) => onFile(event.target.files?.[0])}
        />
      </label>
    </FieldLabel>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-1 text-sm text-[#777b78]">{description}</p>
      </div>
      {children}
    </section>
  );
}

function FieldLabel({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2 text-sm font-semibold">
      <span>
        {label}{" "}
        {hint && (
          <span className="text-xs font-normal text-[#777b78]">({hint})</span>
        )}
      </span>
      {children}
    </label>
  );
}
