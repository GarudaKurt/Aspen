"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { getBusinessInitials } from "@/features/tenant-dashboard/profile/business-initials";
import { MAX_BUSINESS_PHOTOS, validateBusinessPhoto } from "../types";
import type { BusinessPhotosController } from "../use-business-photos";

export function BusinessCoverPhoto({ businessName, controller }: {
  businessName: string;
  controller: BusinessPhotosController;
}) {
  const { photos, busy, progress, error, setError, mutate, run } = controller;
  const cover = photos.find((photo) => photo.isCover);
  // Capture the cover being replaced so another tab's changes cannot be overwritten.
  const [selection, setSelection] = useState<{ file: File; url: string; coverId?: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  useEffect(() => () => {
    if (selection) URL.revokeObjectURL(selection.url);
  }, [selection]);
  const image = selection?.url ?? cover?.url;

  return (
    <section aria-label="Business cover photo" className="mt-5 rounded-xl border border-slate-200 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className={`relative grid aspect-[4/3] w-full shrink-0 place-items-center overflow-hidden rounded-lg sm:w-40 ${image ? "" : "bg-[#edf3ef]"}`}>
          {image ? <Image src={image} alt={`${businessName} cover${selection ? " preview" : ""}`} fill unoptimized sizes="(min-width: 640px) 160px, 90vw" className="object-contain" />
            : <span className="text-3xl font-semibold text-[#3c6355]" aria-label={`${businessName} initials`}>{getBusinessInitials(businessName)}</span>}
        </div>
        <div className="min-w-0 space-y-2">
          <h3 className="text-sm font-semibold">Business cover photo</h3>
          <p className="text-sm text-slate-500">Displayed on your business profile and listing cards.</p>
          <p className="text-xs text-slate-500">JPEG, PNG or WebP · Up to 4 MB · Landscape recommended · Original format preserved</p>
          <div className="flex flex-wrap items-center gap-2">
            <label className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-[#3c6355] focus-within:ring-2 focus-within:ring-[#3c6355] ${busy ? "opacity-50" : "cursor-pointer hover:bg-[#f2f6f3]"}`}>
              <ImagePlus className="size-4" />{cover ? "Replace photo" : "Upload photo"}
              <input aria-label="Choose business cover photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} className="sr-only" onChange={(event) => {
                const file = event.target.files?.[0]; event.target.value = "";
                if (!file) return;
                const invalid = validateBusinessPhoto(file);
                if (invalid) { setError(invalid); return; }
                if (!cover && photos.length >= MAX_BUSINESS_PHOTOS) {
                  setError("Your gallery is full. Choose an existing photo as the cover, or remove one before uploading."); return;
                }
                setError("");
                setSelection({ file, url: URL.createObjectURL(file), coverId: cover?.id });
              }} />
            </label>
            {cover && !selection && <Button type="button" variant="ghost" disabled={busy} className="gap-2 text-red-700" onClick={() => setRemoving(true)}><Trash2 className="size-4" />Remove</Button>}
          </div>
        </div>
      </div>
      {selection && <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
        <p className="w-full truncate text-xs text-slate-500" title={selection.file.name}>Preview: {selection.file.name}</p>
        <Button type="button" disabled={busy} className="bg-[#3c6355] text-white hover:bg-[#2f5044]" onClick={() => void run(async () => {
          await mutate(selection.coverId ? "replace_cover" : "add_cover", selection.coverId, selection.file);
          setSelection(null);
        })}>Save cover photo</Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={() => setSelection(null)}>Cancel</Button>
      </div>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {busy && <div role="status" className="mt-3 space-y-2 text-sm text-[#3c6355]">
        <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Saving photo changes…</span>
        <progress aria-label="Cover photo upload progress" value={progress} max={100} className="h-2 w-full accent-[#3c6355]" />
      </div>}
      <Dialog open={removing} onOpenChange={(open) => { if (!busy) setRemoving(open); }}>
        <DialogContent><DialogHeader><h2 className="text-lg font-semibold">Remove the cover photo?</h2><p className="mt-2 text-sm text-slate-500">This photo will be deleted. Your business initials will appear in its place. Other gallery photos will remain available.</p></DialogHeader>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setRemoving(false)}>Cancel</Button><Button type="button" variant="destructive" disabled={busy} onClick={() => void run(async () => {
            if (cover) await mutate("remove_cover", cover.id);
            setRemoving(false);
          })}>Remove photo</Button></div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
