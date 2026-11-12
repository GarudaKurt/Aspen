"use client";
import type { MediaAsset } from "@/features/media/types";
import { validateBusinessPhoto, type BusinessPhoto } from "./types";

type BusinessTarget = { businessId: string; action: "add" | "replace" | "add_cover" | "replace_cover"; photoId?: string };
async function metadata(body: unknown) {
  let response: Response;
  try { response = await fetch("/api/photo-uploads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(75_000) }); }
  catch { throw new Error("The upload could not reach the server. Check your connection and retry this image."); }
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) throw new Error(result?.error ?? (response.status === 413 ? "The upload request is too large. Retry the image or contact support." : `Photo upload failed (HTTP ${response.status}). Retry this image.`));
  return result;
}
function putFile(url: string, file: File, onProgress: (progress: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url); xhr.setRequestHeader("Content-Type", file.type); xhr.timeout = 9 * 60_000;
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 90)); };
    xhr.onerror = () => reject(new Error("Upload could not reach storage. Check your connection; if this persists, check R2 upload CORS."));
    xhr.ontimeout = () => reject(new Error("This upload timed out. Retry the image."));
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Storage rejected this upload (HTTP ${xhr.status}). Retry the image.`));
    xhr.send(file);
  });
}
async function upload(file: File, target: { kind: "business" | "service"; targetId: string; action: string; photoId?: string }, onProgress: (progress: number) => void = () => {}, uploadId = crypto.randomUUID()) {
  const invalid = validateBusinessPhoto(file); if (invalid) throw new Error(invalid);
  onProgress(0);
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const sha256 = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const initialized = await metadata({ operation: "init", uploadId, ...target, name: file.name, type: file.type, size: file.size, sha256 });
  if (!initialized.uploaded) await putFile(initialized.uploadUrl, file, onProgress);
  onProgress(95);
  const result = await metadata({ operation: "complete", ticket: initialized.ticket });
  onProgress(100);
  return result;
}
export async function uploadBusinessPhoto(file: File, target: BusinessTarget, onProgress?: (progress: number) => void, uploadId?: string): Promise<BusinessPhoto[]> {
  const result = await upload(file, { kind: "business", targetId: target.businessId, action: target.action, photoId: target.photoId }, onProgress, uploadId);
  if (!Array.isArray(result.photos)) throw new Error("The photo was saved but its gallery could not refresh. Retry to refresh.");
  return result.photos;
}
export async function uploadServicePhoto(file: File, serviceId: string, onProgress?: (progress: number) => void, uploadId?: string): Promise<MediaAsset> {
  const result = await upload(file, { kind: "service", targetId: serviceId, action: "add" }, onProgress, uploadId);
  if (!result.asset) throw new Error("The photo was saved but its details could not refresh. Retry to refresh.");
  return result.asset;
}

export async function cancelPhotoUpload(uploadId: string): Promise<void> {
  await metadata({ operation: "cancel", uploadId });
}
