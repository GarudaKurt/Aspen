"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpenCheck,
  Building2,
  Check,
  ChevronLeft,
  FileCheck2,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  { label: "Services", path: "/list-your-business/services", icon: ShieldCheck },
  { label: "Identity", path: "/list-your-business/identity", icon: UserRound },
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
  const [providerType, setProviderType] = useState("Individual provider");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});

  const activeIndex = Math.max(
    0,
    steps.findIndex(({ path }) => pathname === path),
  );
  const goNext = () => {
    router.push(steps[Math.min(activeIndex + 1, steps.length - 1)].path);
  };

  const goBack = () => {
    router.push(activeIndex === 0 ? "/#browse" : steps[activeIndex - 1].path);
  };

  const toggleService = (service: string) => {
    setSelectedServices((current) =>
      current.includes(service)
        ? current.filter((item) => item !== service)
        : [...current, service],
    );
  };

  const handleFile = (label: string, file?: File) => {
    if (file) setUploadedFiles((current) => ({ ...current, [label]: file.name }));
  };

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-[#171817] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1040px]">
        <header className="flex items-center justify-between border-b border-[#dededb] pb-5">
          <Link
            href="/#browse"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#242524] hover:text-[#3c6355]"
          >
            <ChevronLeft size={16} />
            Back
          </Link>
          <Link href="/" className="text-base font-medium tracking-wide">
            Logo here
          </Link>
          <span className="w-16" aria-hidden="true" />
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
          <Card className="rounded-xl border-[#d7d8d5] bg-white p-5 shadow-none sm:p-8">
            {activeIndex === 0 && (
              <BusinessStep
                providerType={providerType}
                onProviderTypeChange={setProviderType}
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
                uploadedFiles={uploadedFiles}
                onFile={handleFile}
              />
            )}
            {activeIndex === 3 && <ReviewStep />}
            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#e1e2df] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="ghost"
                type="button"
                onClick={goBack}
                className="justify-start px-0 text-[#242524] hover:bg-transparent hover:text-[#3c6355]"
              >
                <ChevronLeft size={16} />
                {activeIndex === 0 ? "Back to search" : "Back"}
              </Button>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => router.push("/")}
                  className="border-[#cfd2cf] bg-white"
                >
                  Save and exit
                </Button>
                <Button
                  type="button"
                  onClick={
                    activeIndex === steps.length - 1
                      ? () => router.push("/#top")
                      : goNext
                  }
                  className="bg-[#3c6355] text-white hover:bg-[#2f5044]"
                >
                  {activeIndex === steps.length - 1
                    ? "Submit application"
                    : "Save and continue"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}

function ListingStepper({ activeIndex }: { activeIndex: number }) {
  return (
    <nav aria-label="Listing progress" className="overflow-x-auto pb-2 lg:overflow-visible">
      <ol className="flex min-w-max items-start gap-0 lg:block lg:min-w-0">
        {steps.map(({ label, path, icon: Icon }, index) => {
          const isCurrent = index === activeIndex;
          const isComplete = index < activeIndex;
          const isReached = index <= activeIndex;
          const hasNext = index < steps.length - 1;

          return (
            <li key={label} className="relative flex flex-1 items-start lg:block lg:pb-6">
              <Link
                href={path}
                aria-current={isCurrent ? "step" : undefined}
                className={`group relative z-10 flex min-w-[78px] flex-col items-center gap-2 text-center text-xs lg:flex-row lg:items-center lg:gap-2 lg:text-left ${isReached ? "text-[#3c6355]" : "text-[#a0a4a1]"}`}
              >
                <span
                  className={`relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border-2 bg-white transition-colors duration-200 ${isCurrent ? "border-[#3c6355] text-[#3c6355] ring-4 ring-[#3c6355]/10" : isComplete ? "border-emerald-600 bg-emerald-50 text-emerald-600" : "border-[#cfd2cf] text-[#a0a4a1]"}`}
                >
                  {isComplete ? <Check size={16} strokeWidth={2.5} /> : <Icon size={16} />}
                </span>
                <span className="hidden sm:block lg:block">
                  <span className="block font-semibold">{label}</span>
                  <span className="block text-[9px] text-[#a0a4a1]">
                    {isCurrent ? "Current step" : isComplete ? "Completed" : "Not selected yet"}
                  </span>
                </span>
              </Link>
              {hasNext && (
                <span
                  aria-hidden="true"
                  className={`absolute z-0 bg-[#cfd2cf] transition-colors duration-200 ${isComplete ? "bg-emerald-600" : ""} left-[calc(50%+18px)] right-0 top-4 h-0.5 lg:left-4 lg:right-auto lg:top-9 lg:h-auto lg:w-0.5 lg:-translate-x-1/2 lg:bottom-0`}
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
}: {
  providerType: string;
  onProviderTypeChange: (value: string) => void;
}) {
  return (
    <FormSection title="Business information" description="Share the public details customers will see.">
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
              <span className={`size-4 rounded-full border ${providerType === type ? "border-[#3c6355] bg-[#3c6355] shadow-[inset_0_0_0_3px_white]" : "border-[#529dff]"}`} />
              {type}
            </Button>
          ))}
        </div>
      </FieldLabel>
      <FieldLabel label="Business or display name">
        <Input placeholder="e.g. Kalinga Animal Hospital" />
      </FieldLabel>
      <FieldLabel label="Business description" hint="Describe your experience and what makes your service distinctive.">
        <textarea className="min-h-24 w-full rounded-lg border border-[#d2d5d2] bg-white px-3 py-2 text-sm outline-none focus:border-[#3c6355] focus:ring-2 focus:ring-[#3c6355]/20" />
      </FieldLabel>
      <FieldLabel label="Business address">
        <textarea className="min-h-24 w-full rounded-lg border border-[#d2d5d2] bg-white px-3 py-2 text-sm outline-none focus:border-[#3c6355] focus:ring-2 focus:ring-[#3c6355]/20" />
      </FieldLabel>
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
    <FormSection title="Service categories" description="Select one or more categories.">
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
            <span className={`flex size-4 items-center justify-center rounded-sm border ${selectedServices.includes(service) ? "border-[#3c6355] bg-[#3c6355] text-white" : "border-[#b8bdb9]"}`}>
              {selectedServices.includes(service) && <Check size={12} />}
            </span>
            {service}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldLabel label="Service area">
          <Select defaultValue="Cebu City">
            <SelectTrigger><SelectValue /></SelectTrigger>
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
        <textarea className="min-h-24 w-full rounded-lg border border-[#d2d5d2] bg-white px-3 py-2 text-sm outline-none focus:border-[#3c6355] focus:ring-2 focus:ring-[#3c6355]/20" />
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
  return (
    <FormSection title="Verify your identity" description="Your identity documents are private and available only to you and authorized administrators during this demo review.">
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldLabel label="Full name"><Input placeholder="Your legal name" /></FieldLabel>
        <FieldLabel label="Government ID type">
          <Select defaultValue="National ID">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="National ID">National ID</SelectItem>
              <SelectItem value="Passport">Passport</SelectItem>
              <SelectItem value="Driver's license">Driver's license</SelectItem>
            </SelectContent>
          </Select>
        </FieldLabel>
      </div>
      <Card className="rounded-lg border-[#d8dbd8] p-3 shadow-none">
        <FieldLabel label="Contact number">
          <div className="flex gap-2"><Input placeholder="+63 900 000 0000" /><Button type="button" variant="outline">Send code</Button></div>
        </FieldLabel>
        <FieldLabel label="Four-digit verification code">
          <div className="flex gap-2"><Input inputMode="numeric" maxLength={4} /><Button type="button" className="bg-[#2768f5] text-white hover:bg-[#1d55d1]">Verify</Button></div>
        </FieldLabel>
      </Card>
      {["Government ID", "Business Permit"].map((label) => (
        <FileUpload key={label} label={label} fileName={uploadedFiles[label]} onFile={(file) => onFile(label, file)} />
      ))}
    </FormSection>
  );
}

function ReviewStep() {
  return (
    <FormSection title="Review and submit" description="Check every section before sending the application to the administrator.">
      {["Business", "Services", "Identity"].map((section) => (
        <Card key={section} className="rounded-lg border-[#d8dbd8] p-4 shadow-none">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{section}</h3>
            <Button variant="ghost" type="button" className="text-[#3c6355]">EDIT</Button>
          </div>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-8 gap-y-1 text-sm text-[#777b78]">
            <dt>Name</dt><dd>XYZ</dd>
            <dt>Details</dt><dd>XYZ</dd>
            <dt>Status</dt><dd>Ready to review</dd>
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
        <span className="rounded-md border border-[#cfd2cf] px-3 py-1.5 text-xs font-semibold">Upload file</span>
        <input type="file" className="sr-only" accept=".jpg,.jpeg,.png,.pdf" onChange={(event) => onFile(event.target.files?.[0])} />
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
      <span>{label} {hint && <span className="text-xs font-normal text-[#777b78]">({hint})</span>}</span>
      {children}
    </label>
  );
}
