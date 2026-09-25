"use client";

import Image from "next/image";
import { useState, type ChangeEvent } from "react";
import { Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { BusinessProfile, type TenantProfileData } from "@/features/business-profile/components/business-profile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { MobileDashboardNav } from "./dashboard-shell";
import { ServiceFormSheet } from "./service-form-sheet";
import { services as initialServices } from "../mock-data";
import type { ServiceItem } from "../types";

type EditableProfile = TenantProfileData & {
  description: string;
  serviceCoverage: string[];
};

type ServiceDraft = Omit<ServiceItem, "id">;

const coverageOptions = ["Grooming", "Boarding", "Training", "Veterinary"];

const initialProfile: EditableProfile = {
  name: "PawSpot Grooming & Boarding",
  rating: "4.9",
  reviews: "38 reviews",
  category: "Grooming, Boarding",
  address: "Cebu City",
  description: "Full-service grooming and short-stay boarding for dogs and cats.",
  serviceCoverage: ["Grooming", "Boarding", "Training"],
  coverPhoto: null,
  verified: true,
};

export function ProfileView() {
  const [profile, setProfile] = useState<EditableProfile>(initialProfile);
  const [draft, setDraft] = useState<EditableProfile>(initialProfile);
  const [coverageDraft, setCoverageDraft] = useState(initialProfile.serviceCoverage);
  const [editingInfo, setEditingInfo] = useState(false);
  const [editingCoverage, setEditingCoverage] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>(initialServices);
  const [serviceFormOpen, setServiceFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);

  const startInfoEdit = () => {
    setDraft(profile);
    setErrors({});
    setEditingInfo(true);
  };

  const cancelInfoEdit = () => {
    setDraft(profile);
    setErrors({});
    setEditingInfo(false);
  };

  const saveInfo = () => {
    const nextErrors: Record<string, string> = {};
    if (!draft.name.trim()) nextErrors.name = "Business name is required.";
    if (!draft.address.trim()) nextErrors.address = "Address is required.";
    if (!draft.description.trim()) {
      nextErrors.description = "Description is required.";
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setProfile({
      ...draft,
      name: draft.name.trim(),
      address: draft.address.trim(),
      description: draft.description.trim(),
    });
    setErrors({});
    setEditingInfo(false);
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors({ photo: "Please select a valid image file." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors({ photo: "Images must be 5 MB or smaller." });
      return;
    }

    setDraft((current) => ({ ...current, coverPhoto: URL.createObjectURL(file) }));
    setErrors((current) => ({ ...current, photo: "" }));
  };

  const startCoverageEdit = () => {
    setCoverageDraft(profile.serviceCoverage);
    setErrors({});
    setEditingCoverage(true);
  };

  const cancelCoverageEdit = () => {
    setCoverageDraft(profile.serviceCoverage);
    setErrors({});
    setEditingCoverage(false);
  };

  const saveCoverage = () => {
    if (!coverageDraft.length) {
      setErrors({ coverage: "Select at least one service category." });
      return;
    }

    setProfile((current) => ({ ...current, serviceCoverage: coverageDraft }));
    setErrors({});
    setEditingCoverage(false);
  };

  const toggleCoverage = (coverage: string) => {
    setCoverageDraft((current) =>
      current.includes(coverage)
        ? current.filter((item) => item !== coverage)
        : [...current, coverage],
    );
  };

  const openCreateService = () => {
    setEditingService(null);
    setServiceFormOpen(true);
  };

  const openEditService = (service: ServiceItem) => {
    setEditingService(service);
    setServiceFormOpen(true);
  };

  const saveService = (draft: ServiceDraft) => {
    if (editingService) {
      setServiceItems((current) =>
        current.map((service) =>
          service.id === editingService.id ? { ...draft, id: editingService.id } : service,
        ),
      );
    } else {
      setServiceItems((current) => [
        ...current,
        { ...draft, id: crypto.randomUUID() },
      ]);
    }
    setServiceFormOpen(false);
    setEditingService(null);
  };

  const confirmDeleteService = () => {
    if (deleteServiceId) {
      setServiceItems((current) =>
        current.filter((service) => service.id !== deleteServiceId),
      );
    }
    setDeleteServiceId(null);
  };

  return (
    <>
      <MobileDashboardNav />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="mt-1 text-slate-500">
            This is what customers see. Changes are reviewed before going live.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setPreviewOpen(true)}
        >
          Preview public profile
        </Button>
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card className="bg-white p-6 shadow-none">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Business Info</h2>
            {!editingInfo ? (
              <Button type="button" variant="ghost" onClick={startInfoEdit}>
                <Pencil className="mr-2 size-4" /> Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={cancelInfoEdit}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-[#3c6355] text-white hover:bg-[#2f5044]"
                  onClick={saveInfo}
                >
                  Save
                </Button>
              </div>
            )}
          </div>

          {editingInfo ? (
            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="business-name" className="text-sm text-slate-500">
                  Business name
                </label>
                <Input
                  id="business-name"
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, name: event.target.value }))
                  }
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
              </div>
              <div>
                <label htmlFor="business-address" className="text-sm text-slate-500">
                  Address
                </label>
                <Input
                  id="business-address"
                  value={draft.address}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, address: event.target.value }))
                  }
                  aria-invalid={Boolean(errors.address)}
                />
                {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address}</p>}
              </div>
              <div>
                <label htmlFor="business-description" className="text-sm text-slate-500">
                  Description
                </label>
                <textarea
                  id="business-description"
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, description: event.target.value }))
                  }
                  className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-invalid={Boolean(errors.description)}
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-red-600">{errors.description}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-slate-500">Business photo</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {draft.coverPhoto ? (
                    <Image
                      src={draft.coverPhoto}
                      alt="Business photo preview"
                      width={88}
                      height={64}
                      unoptimized
                      className="h-16 w-22 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="grid h-16 w-22 place-items-center rounded-lg bg-[#f1f2f8] text-sm font-semibold text-[#3c6355]">
                      PS
                    </div>
                  )}
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-50">
                    <Upload className="size-4" />
                    Upload photo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={handlePhotoChange}
                    />
                  </label>
                  {draft.coverPhoto && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setDraft((current) => ({ ...current, coverPhoto: null }))}
                    >
                      <X className="mr-2 size-4" /> Remove
                    </Button>
                  )}
                </div>
                {errors.photo && <p className="mt-1 text-xs text-red-600">{errors.photo}</p>}
              </div>
            </div>
          ) : (
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-slate-400">Business name</dt>
                <dd className="font-semibold">{profile.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-400">Provider type</dt>
                <dd className="font-semibold">Registered Business</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-400">Address</dt>
                <dd className="font-semibold">{profile.address}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm text-slate-400">Description</dt>
                <dd className="font-semibold">{profile.description}</dd>
              </div>
            </dl>
          )}
        </Card>

        <Card className="bg-white p-6 text-center shadow-none">
          {profile.coverPhoto ? (
            <Image
              src={profile.coverPhoto}
              alt="Business profile"
              width={80}
              height={80}
              unoptimized
              className="mx-auto size-20 rounded-2xl object-cover"
            />
          ) : (
            <span className="mx-auto grid size-20 place-items-center rounded-2xl bg-[#b78a68] text-2xl font-bold text-white">
              PS
            </span>
          )}
          <h2 className="mt-4 text-xl font-semibold">{profile.name}</h2>
          <p className="text-slate-500">{profile.address} · {profile.category}</p>
          <p className="mt-4 text-[#c5714e]">★ {profile.rating} ({profile.reviews})</p>
        </Card>
      </div>

      <Card className="mt-5 bg-white p-6 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Service Coverage</h2>
          <div className="flex flex-wrap gap-2">
            {!editingCoverage ? (
              <Button type="button" variant="ghost" onClick={startCoverageEdit}>
                <Pencil className="mr-2 size-4" /> Edit coverage
              </Button>
            ) : (
              <>
                <Button type="button" variant="ghost" onClick={cancelCoverageEdit}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-[#3c6355] text-white hover:bg-[#2f5044]"
                  onClick={saveCoverage}
                >
                  Save coverage
                </Button>
              </>
            )}
            <Button
              type="button"
              className="bg-[#3c6355] text-white hover:bg-[#2f5044]"
              onClick={openCreateService}
            >
              <Plus className="mr-2 size-4" /> Create service
            </Button>
          </div>
        </div>

        {editingCoverage ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {coverageOptions.map((coverage) => (
              <label
                key={coverage}
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3"
              >
                <input
                  type="checkbox"
                  checked={coverageDraft.includes(coverage)}
                  onChange={() => toggleCoverage(coverage)}
                  className="size-4 accent-[#3c6355]"
                />
                <span className="font-medium">{coverage}</span>
              </label>
            ))}
            {errors.coverage && (
              <p className="text-xs text-red-600 sm:col-span-2">{errors.coverage}</p>
            )}
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.serviceCoverage.map((coverage) => (
              <span
                key={coverage}
                className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-600"
              >
                {coverage}
              </span>
            ))}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-semibold">Services</h3>
            <span className="text-xs text-slate-500">{serviceItems.length} listed</span>
          </div>
          {serviceItems.length ? (
            serviceItems.map((service) => (
              <article
                key={service.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#3c6355]">{service.category}</p>
                    <h3 className="truncate font-semibold">{service.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{service.description}</p>
                    <p className="mt-2 text-sm font-semibold">
                      {service.price}
                      <span className="ml-2 font-normal text-slate-400">{service.duration}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Edit service"
                      aria-label={`Edit ${service.title}`}
                      onClick={() => openEditService(service)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-red-600 hover:text-red-700"
                      title="Delete service"
                      aria-label={`Delete ${service.title}`}
                      onClick={() => setDeleteServiceId(service.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-lg border border-dashed p-5 text-center text-sm text-slate-500">
              No services yet. Create your first service above.
            </p>
          )}
        </div>
      </Card>

      <ServiceFormSheet
        open={serviceFormOpen}
        service={editingService}
        onClose={() => {
          setServiceFormOpen(false);
          setEditingService(null);
        }}
        onSave={saveService}
      />

      {deleteServiceId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" role="presentation">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-service-title"
            className="w-full max-w-sm rounded-xl border bg-white p-6 shadow-xl"
          >
            <h2 id="delete-service-title" className="text-lg font-semibold">
              Delete service?
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              This service will be removed from your profile.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeleteServiceId(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={confirmDeleteService}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent
          title="Public profile preview"
          onClose={() => setPreviewOpen(false)}
        >
          <div className="min-h-full bg-white">
            <BusinessProfile provider={profile} preview />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
