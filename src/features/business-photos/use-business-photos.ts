"use client";

import { useRef, useState } from "react";
import { toast } from "@/components/ui/toast";
import type { BusinessPhoto } from "./types";

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
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
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
    try { await work(); toast({ title: "Business photos updated.", variant: "success" }); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update photos."); return false; }
    finally { lock.current = false; setBusy(false); }
  };
  return { photos, busy, progress, error, setError, setProgress, mutate, run };
}

export type BusinessPhotosController = ReturnType<typeof useBusinessPhotos>;
