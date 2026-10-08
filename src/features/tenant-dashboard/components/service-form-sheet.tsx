"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ServicePhotoPicker } from "./service-photo-picker";
import type { ServiceItem, ServiceStatus } from "../types";

type ServiceDraft = Omit<ServiceItem, "id">;
const emptyDraft: ServiceDraft = {
  title: "",
  category: "Grooming",
  description: "",
  price: "",
  duration: "",
  photos: [],
  status: "Draft",
};
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 5 * 1024 * 1024;

export function ServiceFormPanel({
  open,
  service,
  onClose,
  onSave,
}: {
  open: boolean;
  service: ServiceItem | null;
  onClose: () => void;
  onSave: (draft: ServiceDraft) => void;
}) {
  const [draft, setDraft] = useState<ServiceDraft>(emptyDraft);
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    if (open) {
      // Reset the controlled page form whenever a service is opened for editing.
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
              status: service.status,
            }
          : emptyDraft,
      );
    }
    setError("");
    setPhotoError("");
  }, [open, service]);

  const update = (field: keyof ServiceDraft, value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));

  const addPhotos = (files: FileList) => {
    const incoming = Array.from(files);
    const invalid = incoming.find(
      (file) => !allowedTypes.has(file.type) || file.size > maxFileSize,
    );
    if (invalid) {
      setPhotoError("Use JPG, PNG, or WebP images up to 5 MB each.");
      return;
    }
    const remaining = 6 - draft.photos.length;
    if (remaining <= 0) {
      setPhotoError("You can add up to 6 photos.");
      return;
    }
    setPhotoError("");
    setDraft((current) => ({
      ...current,
      photos: [
        ...current.photos,
        ...incoming
          .slice(0, remaining)
          .map((file) => URL.createObjectURL(file)),
      ],
    }));
  };

  const removePhoto = (index: number) =>
    setDraft((current) => ({
      ...current,
      photos: current.photos.filter((_, photoIndex) => photoIndex !== index),
    }));
  const movePhoto = (index: number, direction: -1 | 1) =>
    setDraft((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.photos.length) return current;
      const photos = [...current.photos];
      [photos[index], photos[nextIndex]] = [photos[nextIndex], photos[index]];
      return { ...current, photos };
    });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !draft.title.trim() ||
      !draft.description.trim() ||
      !draft.price.trim()
    ) {
      setError("Add a service name, description, and starting price.");
      return;
    }
    onSave({
      ...draft,
      title: draft.title.trim(),
      description: draft.description.trim(),
      price: draft.price.trim(),
      duration: draft.duration.trim() || "By appointment",
      status: draft.status as ServiceStatus,
    });
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-2xl p-0">
        <Card className="overflow-hidden border-0 bg-white p-0 shadow-none">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3c6355]">Service listing</p>
          <h2 className="mt-1 text-xl font-semibold">{service ? "Edit service" : "Add service"}</h2>
        </div>
        <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
      </div>
        <form onSubmit={submit} className="flex flex-col">
          <div className="space-y-5 p-5 sm:p-6">
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
            {error && (
              <p
                role="alert"
                className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </p>
            )}
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-5 sm:flex-row sm:justify-end sm:p-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#3c6355] text-white hover:bg-[#2f5044]"
            >
              Save service
            </Button>
          </div>
        </form>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
