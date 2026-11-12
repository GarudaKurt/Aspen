"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { MAX_BUSINESS_PHOTOS, PHOTO_SIZE_LABEL, validateBusinessPhoto, type BusinessPhoto } from "../types";
import { cancelPhotoUpload } from "../upload-client";

import type { BusinessPhotosController } from "../use-business-photos";

type QueuedPhoto = {
  id: string;
  key: string;
  file: File;
  preview?: string;
  replaceId?: string;
  status: "queued" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  retryable: boolean;
};

const fileKey = (file: File) => JSON.stringify([file.name, file.size, file.type, file.lastModified]);

export function BusinessPhotoManager({ controller }: { controller: BusinessPhotosController }) {
  const { photos, busy, progress, error, setError, mutate, reload, run } = controller;
  const [queue, setQueue] = useState<QueuedPhoto[]>([]);
  const queueRef = useRef<QueuedPhoto[]>([]);
  const previews = useRef(new Set<string>());
  const mounted = useRef(true);
  const uploading = useRef(false);
  const [uploadingQueue, setUploadingQueue] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const [deletePhoto, setDeletePhoto] = useState<BusinessPhoto | null>(null);
  useEffect(() => {
    mounted.current = true;
    const urls = previews.current;
    return () => {
      mounted.current = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const updateQueue = (next: QueuedPhoto[]) => {
    queueRef.current = next;
    if (mounted.current) setQueue(next);
  };
  const updateItem = (id: string, update: Partial<QueuedPhoto>) => {
    updateQueue(queueRef.current.map((item) => item.id === id ? { ...item, ...update } : item));
  };
  const select = (files: FileList | null, replaceId?: string) => {
    if (!files || busy || uploading.current) return;
    if (replaceId && queueRef.current.some((item) => item.replaceId === replaceId && item.status !== "success")) {
      setError("A replacement is already queued for that photo."); return;
    }
    const next = [...queueRef.current];
    const keys = new Set(next.map((item) => item.key));
    let reserved = photos.length + next.filter((item) => !item.replaceId && item.retryable && item.status !== "success").length;
    const notices = new Set<string>();
    for (const file of Array.from(files).slice(0, replaceId ? 1 : undefined)) {
      const key = fileKey(file);
      if (keys.has(key)) { notices.add("Duplicate selections were skipped."); continue; }
      const invalid = validateBusinessPhoto(file);
      if (!invalid && !replaceId && reserved >= MAX_BUSINESS_PHOTOS) {
        notices.add(`You can have up to ${MAX_BUSINESS_PHOTOS} photos. Extra selections were skipped.`);
        continue;
      }
      const preview = invalid ? undefined : URL.createObjectURL(file);
      if (preview) previews.current.add(preview);
      next.push({ id: crypto.randomUUID(), key, file, preview, replaceId, status: invalid ? "error" : "queued", progress: 0, error: invalid ?? undefined, retryable: !invalid });
      keys.add(key);
      if (!invalid && !replaceId) reserved += 1;
    }
    updateQueue(next);
    setError(Array.from(notices).join(" "));
  };
  const removeQueued = (item: QueuedPhoto) => {
    if (busy || uploading.current) return;
    const current = queueRef.current.find((photo) => photo.id === item.id);
    if (!current) return;
    const discard = () => {
      if (current.preview && previews.current.delete(current.preview)) URL.revokeObjectURL(current.preview);
      updateQueue(queueRef.current.filter((photo) => photo.id !== current.id));
    };
    if (current.status !== "error") { discard(); return; }
    // Failed requests may have reserved a gallery slot. Keep their retry ID and
    // preview until cancellation is confirmed, under the shared mutation lock.
    void run(async () => {
      try { await cancelPhotoUpload(current.id); }
      catch (cause) {
        const message = `Unable to discard ${current.file.name}. The photo is still queued. Try removing it again.${cause instanceof Error ? ` ${cause.message}` : ""}`;
        updateItem(current.id, { error: message });
        throw new Error(message);
      }
      discard();
    });
  };
  const upload = (items: QueuedPhoto[]) => {
    if (busy || uploading.current || !items.length) return;
    void run(async () => {
      uploading.current = true;
      setUploadingQueue(true);
      let cursor = 0;
      let failures = 0;
      // A retry reuses the item's UUID and never includes successful uploads.
      const pending = items.filter((item) => item.retryable && (item.status === "queued" || item.status === "error"));
      for (const item of pending) updateItem(item.id, { status: "queued", progress: 0, error: undefined });
      const worker = async () => {
        while (mounted.current && cursor < pending.length) {
          const item = pending[cursor++];
          updateItem(item.id, { status: "uploading" });
          try {
            await mutate(item.replaceId ? "replace" : "add", item.replaceId, item.file, (value) => {
              updateItem(item.id, { progress: Math.min(100, Math.max(0, value)) });
            }, item.id);
            updateItem(item.id, { status: "success", progress: 100 });
          } catch (cause) {
            failures += 1;
            updateItem(item.id, { status: "error", error: cause instanceof Error ? cause.message : "Upload failed. Please try again." });
          }
        }
      };
      try {
        await Promise.all([worker(), worker()]);
        let refreshError = "";
        try { await reload(); }
        catch (cause) { refreshError = cause instanceof Error ? cause.message : "Unable to refresh the gallery."; }
        const failureMessage = failures ? `${failures} photo${failures === 1 ? "" : "s"} failed. Successful uploads are saved; retry only the failed photos.` : "";
        if (failureMessage || refreshError) throw new Error([failureMessage, refreshError].filter(Boolean).join(" "));
      } finally {
        uploading.current = false;
        if (mounted.current) setUploadingQueue(false);
      }
    });
  };
  const ready = queue.filter((item) => item.status === "queued");
  const failed = queue.filter((item) => item.status === "error" && item.retryable);
  const completed = queue.filter((item) => item.status === "success");
  return (
    <Card className="space-y-5 bg-white p-5 shadow-none sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-[#3c6355]">Business photos</h2>
          <p className="mt-1 text-sm text-slate-500">{photos.length}/{MAX_BUSINESS_PHOTOS} photos · JPEG, PNG or WebP · up to {PHOTO_SIZE_LABEL} each</p>
          <p className="mt-1 text-xs text-slate-500">Original image format is preserved after secure server validation.</p>
          <p className="mt-1 text-sm text-slate-500">Choose a cover for your listing. Photos become public when your business is published.</p></div>
        <label className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-[#3c6355] focus-within:ring-2 focus-within:ring-[#3c6355] ${busy ? "opacity-50" : "cursor-pointer hover:bg-[#f2f6f3]"}`}>
          <ImagePlus className="size-4" /> Add photos
          <input aria-label="Add business photos" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} className="sr-only" onChange={(event) => { select(event.target.files); event.target.value = ""; }} />
        </label>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          if (!busy && event.dataTransfer.types.includes("Files")) { dragDepth.current += 1; setDragging(true); }
        }}
        onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = busy ? "none" : "copy"; }}
        onDragLeave={(event) => { event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false); }}
        onDrop={(event) => { event.preventDefault(); dragDepth.current = 0; setDragging(false); select(event.dataTransfer.files); }}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${dragging && !busy ? "border-[#3c6355] bg-[#edf3ef]" : "border-slate-200 bg-slate-50/50"}`}
      >
        <label className={`block rounded-lg text-sm text-[#3c6355] focus-within:ring-2 focus-within:ring-[#3c6355] ${busy ? "opacity-50" : "cursor-pointer"}`}>
          <ImagePlus className="mx-auto mb-2 size-6" />
          <span className="font-medium">Drop photos here or browse files</span>
          <input aria-label="Choose or drop business gallery photos" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} className="sr-only" onChange={(event) => { select(event.target.files); event.target.value = ""; }} />
          <span className="mt-1 block text-xs text-slate-500">Select multiple photos. Two upload at a time.</span>
        </label>
      </div>
      {!photos.length && !queue.length && <p className="text-center text-sm text-slate-500">No business photos yet. Add photos of your space and services to help customers get to know your business.</p>}
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
      {!!queue.length && <div className="space-y-3 border-t pt-4"><h3 className="text-sm font-semibold">Photo uploads</h3>
        <p role="status" className="text-xs text-slate-500">{completed.length} uploaded · {queue.filter((item) => item.status === "error").length} failed · {queue.filter((item) => item.status === "queued" || item.status === "uploading").length} remaining</p>
        <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{queue.map((item) => <div key={item.id} className="min-w-0 space-y-2 rounded-xl border p-3">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-50">{item.preview ? <Image src={item.preview} alt={`Preview of ${item.file.name}`} fill unoptimized sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" /> : <div className="flex h-full items-center justify-center text-slate-400"><ImagePlus className="size-8" /></div>}
            <Button type="button" size="icon" variant="outline" className="absolute right-1 top-1 size-7 bg-white" disabled={busy} aria-label={`Remove queued ${item.file.name}`} onClick={() => removeQueued(item)}><X className="size-4" /></Button></div>
          <p className="truncate text-xs" title={item.file.name}>{item.replaceId ? "Replace: " : "Add: "}{item.file.name}</p>
          <p role="status" className={`text-xs font-medium ${item.status === "error" ? "text-red-700" : "text-[#3c6355]"}`}>
            {item.status === "queued" ? "Ready to upload" : item.status === "success" ? "Uploaded" : item.status === "error" ? "Failed" : item.progress >= 95 ? "Saving photo…" : `Uploading… ${item.progress}%`}
          </p>
          {item.status === "uploading" && <progress aria-label={`Upload progress for ${item.file.name}`} value={item.progress} max={100} className="h-2 w-full accent-[#3c6355]" />}
          {item.error && <p role="alert" className="break-words text-xs text-red-700">{item.error}</p>}
          {item.status === "error" && item.retryable && <Button type="button" variant="outline" disabled={busy} className="w-full text-xs" onClick={() => upload([item])}>Retry photo</Button>}
        </div>)}</div>
        <div className="flex flex-wrap gap-2">
          {!!ready.length && <Button type="button" disabled={busy} className="bg-[#3c6355] text-white hover:bg-[#2f5044]" onClick={() => upload(ready)}>Upload {ready.length} photo{ready.length === 1 ? "" : "s"}</Button>}
          {!!failed.length && <Button type="button" variant="outline" disabled={busy} onClick={() => upload(failed)}>Retry {failed.length} failed photo{failed.length === 1 ? "" : "s"}</Button>}
          {!!completed.length && <Button type="button" variant="ghost" disabled={busy} onClick={() => completed.forEach(removeQueued)}>Clear completed</Button>}
        </div>
      </div>}
      {busy && <div role="status" aria-live="polite" className="space-y-2 text-sm text-[#3c6355]"><span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />{uploadingQueue ? "Uploading photos and refreshing gallery…" : "Saving photo changes…"}</span>{!uploadingQueue && <progress aria-label="Photo upload progress" value={progress} max={100} className="h-2 w-full accent-[#3c6355]" />}</div>}
      <Dialog open={Boolean(deletePhoto)} onOpenChange={(open) => { if (!open && !busy) setDeletePhoto(null); }}>
        <DialogContent><DialogHeader><h2 className="text-lg font-semibold">Delete this business photo?</h2><p className="mt-2 text-sm text-slate-500">It will be removed from your gallery and public listing. If it is the cover, another photo will be selected.</p></DialogHeader>
          <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setDeletePhoto(null)}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={() => void run(async () => { if (deletePhoto) await mutate("delete", deletePhoto.id); setDeletePhoto(null); })}>Delete photo</Button></div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
