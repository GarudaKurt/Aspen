"use client";

import { AspenLogo } from "@/components/brand/aspen-logo";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { emailSchema } from "@/shared/schemas/contact.schema";
import {
  useListingStore,
  type BillingDetails,
} from "@/features/business-profile/store/onboarding.store";
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

export function ListingPage() {
  const pathname = usePathname();
  const router = useRouter();
  const providerType = useListingStore((state) => state.providerType);
  const setProviderType = useListingStore((state) => state.setProviderType);
  const businessName = useListingStore((state) => state.businessName);
  const businessDescription = useListingStore((state) => state.businessDescription);
  const locationDetails = useListingStore((state) => state.locationDetails);
  const setBusinessField = useListingStore((state) => state.setBusinessField);
  const setLocationField = useListingStore((state) => state.setLocationField);
  const selectedServices = useListingStore((state) => state.selectedServices);
  const toggleService = useListingStore((state) => state.toggleService);
  const uploadedFiles = useListingStore((state) => state.uploadedFiles);
  const setUploadedFile = useListingStore((state) => state.setUploadedFile);
  const billing = useListingStore((state) => state.billing);
  const setBillingField = useListingStore((state) => state.setBillingField);
  const [billingErrors, setBillingErrors] = useState<Record<string, string>>({});
  const [submissionOpen, setSubmissionOpen] = useState(false);

  const activeIndex = Math.max(
    0,
    steps.findIndex(({ path }) => pathname === path),
  );
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
    router.push(steps[Math.min(activeIndex + 1, steps.length - 1)].path);
  };

  const goBack = () => {
    router.push(activeIndex === 0 ? "/#browse" : steps[activeIndex - 1].path);
  };

  const submitApplication = () => {
    // Mock successful submission until the application is connected to a backend.
    setSubmissionOpen(true);
  };

  const handleFile = (label: string, file?: File) => {
    if (file) setUploadedFile(label, file.name);
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
        </div>

        <div className="grid gap-8 lg:grid-cols-[150px_minmax(0,1fr)] lg:items-start">
          <ListingStepper activeIndex={activeIndex} />
          <Card className="rounded-xl border-[#d7d8d5] bg-white p-6 shadow-none sm:p-8">
            {activeIndex === 0 && (
              <BusinessStep
                providerType={providerType}
                onProviderTypeChange={setProviderType}
                businessName={businessName}
                businessDescription={businessDescription}
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
              <IdentityStep uploadedFiles={uploadedFiles} onFile={handleFile} />
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
            {activeIndex === 4 && <ReviewStep />}
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
                >
                  {activeIndex === steps.length - 1
                    ? "Submit application"
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
          </Card>
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
    </main>
  );
}

function ListingStepper({ activeIndex }: { activeIndex: number }) {
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
                href={path}
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
  locationDetails,
  onBusinessFieldChange,
  onLocationFieldChange,
}: {
  providerType: string;
  onProviderTypeChange: (value: string) => void;
  businessName: string;
  businessDescription: string;
  locationDetails: import("@/features/business-profile/location").BusinessLocationDetails;
  onBusinessFieldChange: (field: "businessName" | "businessDescription", value: string) => void;
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
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldLabel label="Province"><Input value={locationDetails.province} onChange={(event) => onLocationFieldChange("province", event.target.value)} placeholder="Cebu" /></FieldLabel>
        <FieldLabel label="City / Municipality"><Input value={locationDetails.cityMunicipality} onChange={(event) => onLocationFieldChange("cityMunicipality", event.target.value)} placeholder="Cebu City" /></FieldLabel>
        <FieldLabel label="Barangay"><Input value={locationDetails.barangay} onChange={(event) => onLocationFieldChange("barangay", event.target.value)} placeholder="e.g. Lahug" /></FieldLabel>
        <FieldLabel label="Street address"><Input value={locationDetails.streetAddress} onChange={(event) => onLocationFieldChange("streetAddress", event.target.value)} placeholder="e.g. Colon Street" /></FieldLabel>
      </div>
    </FormSection>
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
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldLabel label="Service area">
          <Select defaultValue="Cebu City">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Cebu City">Cebu City</SelectItem>
              <SelectItem value="Mandaue City">Mandaue City</SelectItem>
              <SelectItem value="Lapu-Lapu City">Lapu-Lapu City</SelectItem>
            </SelectContent>
          </Select>
        </FieldLabel>
        <FieldLabel label="Years of experience">
          <Input type="number" placeholder="4" />
        </FieldLabel>
      </div>
      <FieldLabel label="Service summary">
        <textarea className="min-h-24 w-full resize-none rounded-lg border border-[#d2d5d2] bg-white px-3 py-2 text-sm outline-none focus:border-[#3c6355] focus:ring-2 focus:ring-[#3c6355]/20" />
      </FieldLabel>
      <FieldLabel label="Facebook page" hint="Optional">
        <Input placeholder="https://facebook.com/your-business" />
      </FieldLabel>
    </FormSection>
  );
}

function IdentityStep({
  uploadedFiles,
  onFile,
}: {
  uploadedFiles: Record<string, string>;
  onFile: (label: string, file?: File) => void;
}) {
  const [contactNumber, setContactNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<
    "idle" | "verified" | "invalid"
  >("idle");

  const isValidMobileNumber = /^(?:\+63|63|0)9\d{9}$/.test(
    contactNumber.replace(/[\s()-]/g, ""),
  );

  const sendCode = () => {
    if (!isValidMobileNumber) return;
    setSendingCode(true);
    setVerificationStatus("idle");
    window.setTimeout(() => {
      setCodeSent(true);
      setSendingCode(false);
    }, 450);
  };

  const verifyCode = () => {
    setVerificationStatus(verificationCode === "1234" ? "verified" : "invalid");
  };

  return (
    <FormSection
      title="Verify your identity"
      description="Your identity documents are private and available only to you and authorized administrators during this demo review."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldLabel label="Full name">
          <Input placeholder="Your legal name" />
        </FieldLabel>
        <FieldLabel label="Government ID type">
          <Select defaultValue="National ID">
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
              value={contactNumber}
              onChange={(event) => {
                setContactNumber(event.target.value);
                setCodeSent(false);
                setVerificationStatus("idle");
              }}
              placeholder="+63 900 000 0000"
              inputMode="tel"
              aria-invalid={contactNumber.length > 0 && !isValidMobileNumber}
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
          {contactNumber.length > 0 && !isValidMobileNumber && (
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
                    setVerificationStatus("idle");
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
                    verificationStatus === "verified"
                  }
                  className="bg-[#2768f5] text-white hover:bg-[#1d55d1] sm:min-w-24"
                >
                  {verificationStatus === "verified" ? "Verified" : "Verify"}
                </Button>
              </div>
              <span
                id="mock-verification-note"
                className="block text-xs font-normal text-[#69736d]"
              >
                Mock verification: use code 1234. No SMS is sent yet.
              </span>
              {verificationStatus === "invalid" && (
                <span className="block text-xs font-normal text-red-600">
                  That code is incorrect. Check the code and try again.
                </span>
              )}
              {verificationStatus === "verified" && (
                <span className="block text-xs font-normal text-[#3c6355]">
                  Contact number verified successfully.
                </span>
              )}
            </FieldLabel>
          </div>
        </div>
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

function ReviewStep() {
  return (
    <FormSection
      title="Review and submit"
      description="Check every section before sending the application to the administrator."
    >
      {["Business", "Services", "Identity", "Billing"].map((section) => (
        <Card
          key={section}
          className="rounded-lg border-[#d8dbd8] p-4 shadow-none"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{section}</h3>
            <Button variant="ghost" type="button" className="text-[#3c6355]">
              EDIT
            </Button>
          </div>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-8 gap-y-1 text-sm text-[#777b78]">
            <dt>Name</dt>
            <dd>XYZ</dd>
            <dt>Details</dt>
            <dd>XYZ</dd>
            <dt>Status</dt>
            <dd>Ready to review</dd>
          </dl>
        </Card>
      ))}
    </FormSection>
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
