"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { MAX_BUSINESS_PHOTOS, validateBusinessPhoto, type BusinessPhoto } from "../types";

type QueuedPhoto = { file: File; preview: string; replaceId?: string };

function sendPhoto(form: FormData, onProgress: (progress: number) => void): Promise<BusinessPhoto[]> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/business-photos");
    xhr.timeout = 60_000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 95));
    };
    xhr.onerror = () => reject(new Error("Upload interrupted. Check your connection and reload the gallery before retrying."));
    xhr.ontimeout = () => reject(new Error("Upload timed out. Reload the gallery to check whether it was saved before retrying."));
    xhr.onload = () => {
      let result;
      try { result = JSON.parse(xhr.responseText); } catch { reject(new Error("Unable to save this photo. Please try again.")); return; }
      if (xhr.status >= 200 && xhr.status < 300 && Array.isArray(result.photos)) {
        onProgress(100); resolve(result.photos);
      } else reject(new Error(result.error ?? "Unable to save this photo."));
    };
    xhr.send(form);
  });
}

export function BusinessPhotoManager({ businessId, initialPhotos, onChange }: {
  businessId: string; initialPhotos: BusinessPhoto[]; onChange: (photos: BusinessPhoto[]) => void;
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [queue, setQueue] = useState<QueuedPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const previews = useRef(new Set<string>());
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [deletePhoto, setDeletePhoto] = useState<BusinessPhoto | null>(null);
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const select = (files: FileList | null, replaceId?: string) => {
    if (!files || lock.current) return;
    const selected = Array.from(files);
    const invalid = selected.map(validateBusinessPhoto).find(Boolean);
    if (invalid) { setError(invalid); return; }
    if (photos.length + queue.filter((item) => !item.replaceId).length + (replaceId ? 0 : selected.length) > MAX_BUSINESS_PHOTOS) {
      setError(`You can have up to ${MAX_BUSINESS_PHOTOS} photos. Remove a photo before adding another.`); return;
    }
    if (replaceId && queue.some((item) => item.replaceId === replaceId)) {
      setError("A replacement is already queued for that photo."); return;
    }
    setQueue((current) => [...current, ...selected.map((file) => {
      const preview = URL.createObjectURL(file); previews.current.add(preview);
      return { file, preview, replaceId };
    })]);
    setError("");
  };
  const removeQueued = (item: QueuedPhoto) => {
    URL.revokeObjectURL(item.preview); previews.current.delete(item.preview);
    setQueue((current) => current.filter((photo) => photo !== item));
  };
  const mutate = async (action: string, photoId?: string, file?: File) => {
    const form = new FormData(); form.set("businessId", businessId); form.set("action", action);
    if (photoId) form.set("photoId", photoId);
    if (file) form.set("file", file);
    const updated = await sendPhoto(form, setProgress);
    setPhotos(updated); onChange(updated);
  };
  const run = async (work: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setProgress(0);
    try { await work(); toast({ title: "Business photos updated.", variant: "success" }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update photos."); }
    finally { lock.current = false; setBusy(false); }
  };
  return (
    <Card className="space-y-5 bg-white p-5 shadow-none sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-[#3c6355]">Business photos</h2>
          <p className="mt-1 text-sm text-slate-500">{photos.length}/{MAX_BUSINESS_PHOTOS} photos · JPEG, PNG or WebP · up to 4 MB each</p>
          <p className="mt-1 text-sm text-slate-500">Choose a cover for your listing. Photos become public when your business is published.</p></div>
        <label className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-[#3c6355] focus-within:ring-2 focus-within:ring-[#3c6355] ${busy ? "opacity-50" : "cursor-pointer hover:bg-[#f2f6f3]"}`}>
          <ImagePlus className="size-4" /> Add photos
          <input aria-label="Add business photos" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} className="sr-only" onChange={(event) => { select(event.target.files); event.target.value = ""; }} />
        </label>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!photos.length && !queue.length && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No business photos yet. Add photos of your space and services to help customers get to know your business.</p>}
      <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {photos.map((photo) => <article key={photo.id} className="overflow-hidden rounded-xl border">
          <div className="relative aspect-[4/3] bg-slate-50"><Image src={photo.url} alt={photo.name} fill unoptimized className="object-cover" sizes="(min-width: 1024px) 25vw, 50vw" />
            {photo.isCover && <span className="absolute left-2 top-2 rounded-full bg-[#3c6355] px-3 py-1 text-xs font-semibold text-white">Cover</span>}</div>
          <div className="space-y-2 p-3"><p className="truncate text-xs text-slate-500" title={photo.name}>{photo.name}</p>
            <Button type="button" variant="outline" disabled={busy || photo.isCover} className="w-full gap-2 text-xs" onClick={() => void run(() => mutate("cover", photo.id))}><Star className="size-4" />{photo.isCover ? "Current cover" : "Use as cover"}</Button>
            <div className="flex items-center justify-between gap-2">
              <label className="cursor-pointer rounded-md px-2 py-2 text-sm text-[#3c6355] hover:bg-slate-50 focus-within:ring-2"><input aria-label={`Replace ${photo.name}`} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(event) => { select(event.target.files, photo.id); event.target.value = ""; }} />Replace</label>
              <Button type="button" variant="ghost" disabled={busy} aria-label={`Delete ${photo.name}`} onClick={() => setDeletePhoto(photo)}><Trash2 className="size-4 text-red-600" /></Button>
            </div>
          </div>
        </article>)}
      </div>
      {!!queue.length && <div className="space-y-3 border-t pt-4"><h3 className="text-sm font-semibold">Ready to upload</h3>
        <div className="flex flex-wrap gap-3">{queue.map((item) => <div key={item.preview} className="w-28">
          <div className="relative aspect-square overflow-hidden rounded-lg"><Image src={item.preview} alt={`Preview of ${item.file.name}`} fill unoptimized className="object-cover" />
            <Button type="button" size="icon" variant="outline" className="absolute right-1 top-1 size-7 bg-white" disabled={busy} aria-label={`Remove queued ${item.file.name}`} onClick={() => removeQueued(item)}><X className="size-4" /></Button></div>
          <p className="mt-1 truncate text-xs">{item.replaceId ? "Replace: " : "Add: "}{item.file.name}</p>
        </div>)}</div>
        <Button type="button" disabled={busy} className="bg-[#3c6355] text-white hover:bg-[#2f5044]" onClick={() => void run(async () => {
          for (const item of queue) { setProgress(0); await mutate(item.replaceId ? "replace" : "add", item.replaceId, item.file); removeQueued(item); }
        })}>Upload {queue.length} photo{queue.length === 1 ? "" : "s"}</Button>
      </div>}
      {busy && <div role="status" aria-live="polite" className="space-y-2 text-sm text-[#3c6355]"><span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />{progress >= 95 ? "Saving photo changes…" : `Uploading… ${progress}%`}</span><progress aria-label="Photo upload progress" value={progress} max={100} className="h-2 w-full accent-[#3c6355]" /></div>}
      <Dialog open={Boolean(deletePhoto)} onOpenChange={(open) => { if (!open && !busy) setDeletePhoto(null); }}>
        <DialogContent><DialogHeader><h2 className="text-lg font-semibold">Delete this business photo?</h2><p className="mt-2 text-sm text-slate-500">It will be removed from your gallery and public listing. If it is the cover, another photo will be selected.</p></DialogHeader>
          <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setDeletePhoto(null)}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={() => void run(async () => { if (deletePhoto) await mutate("delete", deletePhoto.id); setDeletePhoto(null); })}>Delete photo</Button></div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
