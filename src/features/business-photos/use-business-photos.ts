"use client";

import { useRef, useState } from "react";
import { toast } from "@/components/ui/toast";
import type { BusinessPhoto } from "./types";
import { uploadBusinessPhoto } from "./upload-client";

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

export function useBusinessPhotos(businessId: string, initialPhotos: BusinessPhoto[], onChange: (photos: BusinessPhoto[]) => void) {
  const [photos, setPhotos] = useState(initialPhotos);
  const currentPhotos = useRef(initialPhotos);
  const replacedIds = useRef(new Set<string>());
  const revision = useRef(0);
  const reloadSequence = useRef(0);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const publish = (updated: BusinessPhoto[]) => {
    currentPhotos.current = updated;
    revision.current += 1;
    setPhotos(updated); onChange(updated);
  };
  const mutate = async (action: string, photoId?: string, file?: File, onProgress: (progress: number) => void = setProgress, uploadId?: string) => {
    revision.current += 1;
    if (action === "add" || action === "replace" || action === "add_cover" || action === "replace_cover") {
      if (!file) throw new Error("Select a photo to upload.");
      const updated: BusinessPhoto[] = await uploadBusinessPhoto(file, { businessId, action, photoId }, onProgress, uploadId);
      if (action === "add" || action === "replace") {
        // Parallel uploads return snapshots taken at different times. Preserve every
        // successful addition and never resurrect an already replaced photo.
        if (photoId && !updated.some((photo) => photo.id === photoId)) replacedIds.current.add(photoId);
        const merged = new Map(currentPhotos.current.map((photo) => [photo.id, photo]));
        for (const photo of updated) if (!replacedIds.current.has(photo.id)) merged.set(photo.id, photo);
        for (const id of replacedIds.current) merged.delete(id);
        publish(Array.from(merged.values()));
      } else publish(updated);
    } else {
      const form = new FormData(); form.set("businessId", businessId); form.set("action", action);
      if (photoId) form.set("photoId", photoId);
      publish(await sendPhoto(form, onProgress));
    }
  };
  const reload = async () => {
    const startedAt = revision.current;
    const sequence = ++reloadSequence.current;
    const response = await fetch(`/api/business-photos?businessId=${encodeURIComponent(businessId)}`, {
      cache: "no-store", signal: AbortSignal.timeout(60_000),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(result?.photos)) {
      throw new Error(result?.error ?? "Unable to refresh the gallery. Your successful uploads are saved.");
    }
    // A refresh started before a mutation must not overwrite its newer result.
    if (startedAt === revision.current && sequence === reloadSequence.current) publish(result.photos);
  };
  const run = async (work: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setProgress(0);
    try { await work(); toast({ title: "Business photos updated.", variant: "success" }); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update photos."); return false; }
    finally { lock.current = false; setBusy(false); }
  };
  return { photos, busy, progress, error, setError, setProgress, mutate, reload, run };
}

export type BusinessPhotosController = ReturnType<typeof useBusinessPhotos>;
