"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetFooter } from "@/components/ui/sheet";
import { ServicePhotoPicker, type UploadStatus } from "./service-photo-picker";
import { validateBusinessPhoto } from "@/features/business-photos/types";
import type { ServiceItem, ServiceStatus } from "../types";

export type ServiceDraft = Omit<ServiceItem, "id"> & { photoFiles?: File[]; photoFilePreviews?: string[] };
const emptyDraft: ServiceDraft = {
  title: "",
  category: "Grooming",
  description: "",
  price: "",
  duration: "",
  photos: [],
  photoAssetIds: [],
  status: "Draft",
};
const fileKey = (file: File) => JSON.stringify([file.name, file.size, file.type, file.lastModified]);

export function ServiceFormSheet({
  open,
  service,
  onClose,
  onSave,
  onBeforeRemovePhoto,
  busy = false,
  saveError = "",
  uploadStatuses = {},
}: {
  open: boolean;
  service: ServiceItem | null;
  onClose: () => void | Promise<void>;
  onSave: (draft: ServiceDraft, retryPreview?: string) => void | Promise<void>;
  onBeforeRemovePhoto?: (preview: string) => Promise<void>;
  busy?: boolean;
  saveError?: string;
  uploadStatuses?: Record<string, UploadStatus>;
}) {
  const [draft, setDraft] = useState<ServiceDraft>(emptyDraft);
  const [photoFilesByPreview, setPhotoFilesByPreview] = useState<Record<string, File>>({});
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const previewUrls = useRef(new Set<string>());

  useEffect(() => {
    const urls = previewUrls.current;
    if (open) {
      // Reset the controlled sheet form whenever a service is opened for editing.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(
        service
          ? {
              title: service.title,
              category: service.category,
              description: service.description,
              price: service.price,
              duration: service.duration,
              photos: service.photos ?? [],
              photoAssetIds: service.photoAssetIds ?? service.photos.map(() => null),
              status: service.status,
            }
          : emptyDraft,
      );
      setPhotoFilesByPreview({});
    }
    setError("");
    setPhotoError("");
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, [open, service]);

  const update = (field: keyof ServiceDraft, value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));

  const addPhotos = (files: FileList) => {
    if (busy) return;
    const remaining = 6 - draft.photos.length;
    const seen = new Set(Object.values(photoFilesByPreview).map(fileKey));
    const accepted: File[] = [];
    const errors: string[] = [];
    let duplicates = 0;
    let overflow = 0;
    for (const file of Array.from(files)) {
      const validationError = validateBusinessPhoto(file);
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
        continue;
      }
      const key = fileKey(file);
      if (seen.has(key)) {
        duplicates++;
        continue;
      }
      seen.add(key);
      if (accepted.length >= remaining) {
        overflow++;
        continue;
      }
      accepted.push(file);
    }
    if (duplicates) errors.push(`${duplicates} duplicate photo(s) skipped.`);
    if (overflow) errors.push(`${overflow} photo(s) skipped. You can add up to 6 photos.`);
    setPhotoError(errors.join("\n"));
    const previews = accepted.map((file) => {
      const preview = URL.createObjectURL(file);
      previewUrls.current.add(preview);
      return preview;
    });
    setDraft((current) => ({
      ...current,
      photos: [
        ...current.photos,
        ...previews,
      ],
      photoAssetIds: [...(current.photoAssetIds ?? []), ...previews.map(() => null)],
    }));
    setPhotoFilesByPreview((current) => ({
      ...current,
      ...Object.fromEntries(previews.map((preview, index) => [preview, accepted[index]])),
    }));
  };

  const removePhoto = async (index: number) => {
    if (busy) return;
    const removed = draft.photos[index];
    if (!removed) return;
    setPhotoError("");
    try {
      await onBeforeRemovePhoto?.(removed);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Could not cancel this upload. Please try removing the photo again.");
      return;
    }
    if (removed) {
      setPhotoFilesByPreview((files) => {
        const next = { ...files };
        delete next[removed];
        return next;
      });
      if (previewUrls.current.delete(removed)) URL.revokeObjectURL(removed);
    }
    setDraft((current) => {
      return {
        ...current,
        photos: current.photos.filter((_, photoIndex) => photoIndex !== index),
        photoAssetIds: (current.photoAssetIds ?? []).filter((_, photoIndex) => photoIndex !== index),
      };
    });
  };
  const movePhoto = (index: number, direction: -1 | 1) => {
    if (busy) return;
    setDraft((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.photos.length) return current;
      const photos = [...current.photos];
      const photoAssetIds = [...(current.photoAssetIds ?? [])];
      [photos[index], photos[nextIndex]] = [photos[nextIndex], photos[index]];
      [photoAssetIds[index], photoAssetIds[nextIndex]] = [photoAssetIds[nextIndex], photoAssetIds[index]];
      return { ...current, photos, photoAssetIds };
    });
  };

  const saveDraft = (retryPreview?: string) => {
    if (busy) return;
    if (
      !draft.title.trim() ||
      !draft.description.trim() ||
      !draft.price.trim()
    ) {
      setError("Add a service name, description, and starting price.");
      return;
    }
    setError("");
    void onSave({
      ...draft,
      title: draft.title.trim(),
      description: draft.description.trim(),
      price: draft.price.trim(),
      duration: draft.duration.trim() || "By appointment",
      status: draft.status as ServiceStatus,
      photoFiles: draft.photos.map((photo) => photoFilesByPreview[photo]).filter(Boolean),
      photoFilePreviews: draft.photos.filter((photo) => Boolean(photoFilesByPreview[photo])),
    }, retryPreview);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveDraft();
  };
  const close = () => { if (!busy) void onClose(); };

  return (
    <Sheet open={open} onOpenChange={(value) => !value && close()}>
      <SheetContent
        title={service ? "Edit service" : "Add service"}
        onClose={close}
      >
        <form onSubmit={submit} className="flex flex-1 flex-col">
          <fieldset disabled={busy} className="min-w-0 space-y-5 p-5">
            <div>
              <Label htmlFor="service-title">Service name</Label>
              <Input
                id="service-title"
                value={draft.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="e.g. Full Grooming Package"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="service-category">Category</Label>
              <select
                id="service-category"
                value={draft.category}
                onChange={(event) => update("category", event.target.value)}
                className="mt-2 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option>Veterinary</option>
                <option>Grooming</option>
                <option>Boarding</option>
              </select>
            </div>
            <div>
              <Label htmlFor="service-description">Description</Label>
              <textarea
                id="service-description"
                value={draft.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="Describe what customers can expect."
                className="mt-2 min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#3c6355]"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="service-price">Starting price</Label>
                <Input
                  id="service-price"
                  value={draft.price}
                  onChange={(event) => update("price", event.target.value)}
                  placeholder="₱500"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="service-duration">Duration</Label>
                <Input
                  id="service-duration"
                  value={draft.duration}
                  onChange={(event) => update("duration", event.target.value)}
                  placeholder="60 min"
                  className="mt-2"
                />
              </div>
            </div>
            <ServicePhotoPicker
              photos={draft.photos}
              error={photoError}
              onAdd={addPhotos}
              onRemove={removePhoto}
              onMove={movePhoto}
              busy={busy}
              uploadStatuses={uploadStatuses}
              photoFilesByPreview={photoFilesByPreview}
              onRetry={(preview) => saveDraft(preview)}
            />
            <div>
              <Label htmlFor="service-status">Availability</Label>
              <select
                id="service-status"
                value={draft.status}
                onChange={(event) => update("status", event.target.value)}
                className="mt-2 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="Active">Published and available</option>
                <option value="Draft">Draft</option>
                <option value="Paused">Paused</option>
              </select>
            </div>
            {(error || saveError) && (
              <p
                role="alert"
                className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error || saveError}
              </p>
            )}
          </fieldset>
          <SheetFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={close}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className="bg-[#3c6355] text-white hover:bg-[#2f5044]"
            >
              {busy ? "Saving…" : "Save service"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
