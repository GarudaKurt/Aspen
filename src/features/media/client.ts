"use client";

import { completeMediaUpload, createMediaUpload, deleteMediaAsset } from "./api/actions";
import type { MediaUploadRequest } from "./schemas";
import type { MediaAsset } from "./types";

export async function uploadMediaFile(
  file: File,
  input: Omit<MediaUploadRequest, "fileName" | "contentType" | "byteSize">,
): Promise<MediaAsset> {
  const ticket = await createMediaUpload({
    ...input,
    fileName: file.name,
    contentType: file.type,
    byteSize: file.size,
  });
  if (!ticket.ok) throw new Error(ticket.error);
  const response = await fetch(ticket.data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!response.ok) {
    await deleteMediaAsset(ticket.data.assetId);
    throw new Error("The file could not be uploaded to Cloudflare R2.");
  }
  const completed = await completeMediaUpload(ticket.data.assetId);
  if (!completed.ok) throw new Error(completed.error);
  return completed.data;
}
