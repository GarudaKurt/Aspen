"use client";

import Image from "next/image";
import { useState, type ChangeEvent } from "react";
import { Maximize2, Minimize2, Pencil, Upload, X } from "lucide-react";
import { BusinessProfile } from "@/features/business-profile/components/business-profile";
import { amenityOptions, type BusinessAmenity } from "@/features/business-profile/amenities";
import { AmenityIcon } from "@/features/business-profile/components/amenity-icon";
import {
  businessDays,
  getBusinessHoursDisplayRows,
  isValidBusinessHours,
  type BusinessHoursDay,
} from "@/features/business-profile/business-hours";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TimePicker } from "@/components/ui/time-picker";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { MobileDashboardNav } from "./dashboard-shell";
import {
  updateTenantProfile,
  useTenantProfile,
} from "../profile/profile.store";
import type { TenantProfile } from "../profile/profile.store";

type EditableProfile = TenantProfile;

const coverageOptions = ["Grooming", "Boarding", "Training", "Veterinary"];

export function ProfileView() {
  const profile = useTenantProfile();
  const [draft, setDraft] = useState<EditableProfile>(profile);
  const [coverageDraft, setCoverageDraft] = useState(profile.serviceCoverage);
  const [hoursDraft, setHoursDraft] = useState<BusinessHoursDay[]>(profile.businessHours);
  const [copySourceDay, setCopySourceDay] = useState(profile.businessHours[0]?.day ?? businessDays[0]);
  const [copyTargetDays, setCopyTargetDays] = useState<string[]>([]);
  const [amenitiesDraft, setAmenitiesDraft] = useState<BusinessAmenity[]>(profile.amenities);
  const [customAmenity, setCustomAmenity] = useState("");
  const [editingInfo, setEditingInfo] = useState(false);
  const [editingHours, setEditingHours] = useState(false);
  const [editingAmenities, setEditingAmenities] = useState(false);
  const [editingCoverage, setEditingCoverage] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

    updateTenantProfile({
      ...draft,
      name: draft.name.trim(),
      address: draft.address.trim(),
      description: draft.description.trim(),
    });
    setErrors({});
    setEditingInfo(false);
  };

  const startHoursEdit = () => {
    setHoursDraft(profile.businessHours);
    setCopyTargetDays([]);
    setErrors({});
    setEditingHours(true);
  };

  const cancelHoursEdit = () => {
    setHoursDraft(profile.businessHours);
    setCopyTargetDays([]);
    setErrors({});
    setEditingHours(false);
  };

  const saveHours = () => {
    if (hoursDraft.some((entry) => !isValidBusinessHours(entry))) {
      setErrors({
        businessHours: "Opening time must be earlier than closing time for every open day.",
      });
      return;
    }

    updateTenantProfile({ businessHours: hoursDraft });
    setErrors({});
    setEditingHours(false);
  };

  const updateHours = (day: string, update: Partial<BusinessHoursDay>) => {
    setHoursDraft((current) =>
      current.map((entry) => (entry.day === day ? { ...entry, ...update } : entry)),
    );
  };

  const toggleCopyTarget = (day: string) => {
    setCopyTargetDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    );
  };

  const applyHoursToTargets = () => {
    const source = hoursDraft.find((entry) => entry.day === copySourceDay);
    if (!source || !copyTargetDays.length) return;
    setHoursDraft((current) =>
      current.map((entry) =>
        copyTargetDays.includes(entry.day)
          ? { ...entry, open: source.open, openTime: source.openTime, closeTime: source.closeTime }
          : entry,
      ),
    );
    setCopyTargetDays([]);
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

  const startAmenitiesEdit = () => {
    setAmenitiesDraft(profile.amenities);
    setCustomAmenity("");
    setErrors({});
    setEditingAmenities(true);
  };

  const cancelAmenitiesEdit = () => {
    setAmenitiesDraft(profile.amenities);
    setCustomAmenity("");
    setErrors({});
    setEditingAmenities(false);
  };

  const saveAmenities = () => {
    updateTenantProfile({ amenities: amenitiesDraft });
    setErrors({});
    setEditingAmenities(false);
  };

  const toggleAmenity = (amenity: BusinessAmenity) => {
    setAmenitiesDraft((current) =>
      current.some((item) => item.id === amenity.id)
        ? current.filter((item) => item.id !== amenity.id)
        : [...current, amenity],
    );
  };

  const addCustomAmenity = () => {
    const label = customAmenity.trim();
    if (!label) {
      setErrors({ amenities: "Enter a custom amenity before adding it." });
      return;
    }
    if (amenitiesDraft.some((amenity) => amenity.label.toLowerCase() === label.toLowerCase())) {
      setErrors({ amenities: "That amenity has already been added." });
      return;
    }
    setAmenitiesDraft((current) => [
      ...current,
      { id: `custom-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, label, custom: true },
    ]);
    setCustomAmenity("");
    setErrors((current) => ({ ...current, amenities: "" }));
  };

  const removeAmenity = (id: string) => {
    setAmenitiesDraft((current) => current.filter((amenity) => amenity.id !== id));
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

    updateTenantProfile({ serviceCoverage: coverageDraft });
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Business Hours</h2>
            <p className="mt-1 text-sm text-slate-500">
              Set the weekly schedule customers will see on your public profile.
            </p>
          </div>
          {!editingHours ? (
            <Button type="button" variant="ghost" onClick={startHoursEdit}>
              <Pencil className="mr-2 size-4" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={cancelHoursEdit}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-[#3c6355] text-white hover:bg-[#2f5044]"
                onClick={saveHours}
              >
                Save
              </Button>
            </div>
          )}
        </div>
        {editingHours ? (
          <BusinessHoursEditor
            schedule={hoursDraft}
            onChange={updateHours}
            copySourceDay={copySourceDay}
            onCopySourceChange={setCopySourceDay}
            copyTargetDays={copyTargetDays}
            onToggleCopyTarget={toggleCopyTarget}
            onApplyHours={applyHoursToTargets}
          />
        ) : (
          <div className="mt-5">
            <BusinessHoursList schedule={profile.businessHours} />
          </div>
        )}
        {errors.businessHours && (
          <p className="mt-2 text-xs text-red-600">{errors.businessHours}</p>
        )}
      </Card>

      <Card className="h-full bg-white p-6 shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Amenities</h2>
            <p className="mt-1 text-sm text-slate-500">
              Highlight what customers can expect at your business.
            </p>
          </div>
          {!editingAmenities ? (
            <Button type="button" variant="ghost" onClick={startAmenitiesEdit}>
              <Pencil className="mr-2 size-4" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={cancelAmenitiesEdit}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-[#3c6355] text-white hover:bg-[#2f5044]"
                onClick={saveAmenities}
              >
                Save
              </Button>
            </div>
          )}
        </div>
        {editingAmenities ? (
          <AmenitiesEditor
            selected={amenitiesDraft}
            customAmenity={customAmenity}
            onCustomAmenityChange={setCustomAmenity}
            onToggle={toggleAmenity}
            onAddCustom={addCustomAmenity}
            onRemove={removeAmenity}
          />
        ) : (
          <div className="mt-5 flex flex-wrap gap-2">
            {profile.amenities.length ? profile.amenities.map((amenity) => (
              <span
                key={amenity.id}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-600"
              >
                <AmenityIcon amenity={amenity} />
                {amenity.label}
              </span>
            )) : (
              <p className="text-sm text-slate-500">No amenities added yet.</p>
            )}
          </div>
        )}
        {errors.amenities && <p className="mt-2 text-xs text-red-600">{errors.amenities}</p>}
      </Card>

      <Card className="mt-5 bg-white p-6 shadow-none">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Service Coverage</h2>
          {!editingCoverage ? (
            <Button type="button" variant="ghost" onClick={startCoverageEdit}>
              <Pencil className="mr-2 size-4" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={cancelCoverageEdit}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-[#3c6355] text-white hover:bg-[#2f5044]"
                onClick={saveCoverage}
              >
                Save
              </Button>
            </div>
          )}
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
      </Card>

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent
          title="Public profile preview"
          onClose={() => setPreviewOpen(false)}
          className={previewMaximized ? "max-w-none" : ""}
          headerActions={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setPreviewMaximized((current) => !current)}
              aria-label={previewMaximized ? "Minimize preview" : "Maximize preview"}
              title={previewMaximized ? "Minimize preview" : "Maximize preview"}
            >
              {previewMaximized ? <Minimize2 /> : <Maximize2 />}
            </Button>
          }
        >
          <div className="min-h-full bg-white">
            <BusinessProfile provider={profile} preview />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}


function BusinessHoursList({ schedule }: { schedule: BusinessHoursDay[] }) {
  return (
    <div className="max-w-[520px] space-y-2 text-sm">
      {getBusinessHoursDisplayRows(schedule).map((row) => (
        <div key={row.label} className="flex justify-between gap-4 border-b border-slate-100 pb-2">
          <span className="font-medium">{row.label}</span>
          <span className="text-right text-slate-500">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function BusinessHoursEditor({
  schedule,
  onChange,
  copySourceDay,
  onCopySourceChange,
  copyTargetDays,
  onToggleCopyTarget,
  onApplyHours,
}: {
  schedule: BusinessHoursDay[];
  onChange: (day: string, update: Partial<BusinessHoursDay>) => void;
  copySourceDay: string;
  onCopySourceChange: (day: string) => void;
  copyTargetDays: string[];
  onToggleCopyTarget: (day: string) => void;
  onApplyHours: () => void;
}) {
  return (
    <div className="mt-4 space-y-3">
      {schedule.map((entry) => (
        <div key={entry.day} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(100px,1fr)_auto_minmax(110px,1fr)_minmax(110px,1fr)] sm:items-center">
          <span className="font-medium">{entry.day}</span>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={!entry.open}
              onChange={(event) => onChange(entry.day, { open: !event.target.checked })}
              className="size-4 accent-[#3c6355]"
            />
            Closed
          </label>
          <label className="text-sm text-slate-500">
            <span className="sr-only">{entry.day} opening time</span>
            <TimePicker
              value={entry.openTime}
              disabled={!entry.open}
              onValueChange={(value) => onChange(entry.day, { openTime: value })}
              aria-label={`${entry.day} opening time`}
            />
          </label>
          <label className="text-sm text-slate-500">
            <span className="sr-only">{entry.day} closing time</span>
            <TimePicker
              value={entry.closeTime}
              disabled={!entry.open}
              onValueChange={(value) => onChange(entry.day, { closeTime: value })}
              aria-label={`${entry.day} closing time`}
            />
          </label>
        </div>
      ))}
      <div className="rounded-lg border border-dashed p-3">
        <p className="text-sm font-semibold">Apply hours to multiple days</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,180px)_1fr_auto] sm:items-end">
          <label className="text-sm text-slate-500">
            <span className="mb-1 block">Copy from</span>
            <select
              value={copySourceDay}
              onChange={(event) => onCopySourceChange(event.target.value)}
              className="w-full rounded-md border border-input bg-white px-2 py-2 text-sm"
            >
              {schedule.map((entry) => <option key={entry.day} value={entry.day}>{entry.day}</option>)}
            </select>
          </label>
          <div>
            <span className="mb-1 block text-sm text-slate-500">Apply to</span>
            <div className="flex flex-wrap gap-2">
              {schedule.filter((entry) => entry.day !== copySourceDay).map((entry) => (
                <label key={entry.day} className="inline-flex items-center gap-1 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={copyTargetDays.includes(entry.day)}
                    onChange={() => onToggleCopyTarget(entry.day)}
                    className="size-3.5 accent-[#3c6355]"
                  />
                  {entry.day.slice(0, 3)}
                </label>
              ))}
            </div>
          </div>
          <Button type="button" variant="outline" onClick={onApplyHours} disabled={!copyTargetDays.length}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}


function AmenitiesEditor({
  selected,
  customAmenity,
  onCustomAmenityChange,
  onToggle,
  onAddCustom,
  onRemove,
}: {
  selected: BusinessAmenity[];
  customAmenity: string;
  onCustomAmenityChange: (value: string) => void;
  onToggle: (amenity: BusinessAmenity) => void;
  onAddCustom: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="mt-5 space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {amenityOptions.map((amenity) => (
          <label key={amenity.id} className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm">
            <input
              type="checkbox"
              checked={selected.some((item) => item.id === amenity.id)}
              onChange={() => onToggle(amenity)}
              className="size-4 accent-[#3c6355]"
            />
            <span className="text-[#3c6355]"><AmenityIcon amenity={amenity} /></span>
            <span>{amenity.label}</span>
          </label>
        ))}
      </div>
      <div>
        <label htmlFor="custom-amenity" className="text-sm font-medium">Custom amenity</label>
        <div className="mt-2 flex gap-2">
          <Input
            id="custom-amenity"
            value={customAmenity}
            onChange={(event) => onCustomAmenityChange(event.target.value)}
            placeholder="e.g. Grooming tables"
          />
          <Button type="button" variant="outline" onClick={onAddCustom}>Add</Button>
        </div>
      </div>
      {selected.filter((amenity) => amenity.custom).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.filter((amenity) => amenity.custom).map((amenity) => (
            <span key={amenity.id} className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm">
              <AmenityIcon amenity={amenity} />
              {amenity.label}
              <button type="button" onClick={() => onRemove(amenity.id)} aria-label={`Remove ${amenity.label}`}>
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
