"use client";

import { ImagePlus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PHOTO_SIZE_LABEL } from "@/features/business-photos/types";

export type UploadStatus = {
  status: "queued" | "uploading" | "uploaded" | "error";
  progress: number;
  error?: string;
};

export function ServicePhotoPicker({
  photos,
  error,
  onAdd,
  onRemove,
  onMove,
  busy = false,
  uploadStatuses = {},
  photoFilesByPreview = {},
  onRetry,
}: {
  photos: string[];
  error?: string;
  onAdd: (files: FileList) => void;
  onRemove: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  busy?: boolean;
  uploadStatuses?: Record<string, UploadStatus>;
  photoFilesByPreview?: Record<string, File>;
  onRetry?: (preview: string) => void;
}) {
  return (
    <div>
      <Label htmlFor="service-photos">
        Service photos{" "}
        <span className="font-normal text-slate-400">(optional, up to 6)</span>
      </Label>
      <label
        htmlFor="service-photos"
        aria-disabled={busy}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = busy ? "none" : "copy";
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (!busy && event.dataTransfer.files.length) onAdd(event.dataTransfer.files);
        }}
        className={`mt-2 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center transition focus-within:ring-2 focus-within:ring-[#3c6355] ${busy ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-[#3c6355] hover:bg-[#f5faf7]"}`}
      >
        <ImagePlus className="size-7 text-[#3c6355]" />
        <span className="mt-2 text-sm font-medium">Drop photos here or choose files</span>
        <span className="mt-1 text-xs text-slate-500">
          JPG, JPEG, PNG, or WebP · up to {PHOTO_SIZE_LABEL} each · Original format preserved
        </span>
        <input
          id="service-photos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy}
          className="sr-only"
          onChange={(event) => {
            if (!busy && event.target.files?.length) onAdd(event.target.files);
            event.currentTarget.value = "";
          }}
        />
      </label>
      {photos.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((photo, index) => {
            const file = photoFilesByPreview[photo];
            const upload = uploadStatuses[photo];
            const progress = Math.min(100, Math.max(0, Math.round(upload?.progress ?? 0)));
            const statusLabel = upload?.status === "uploading"
              ? (progress === 100 ? "Finishing upload…" : `Uploading ${progress}%`)
              : upload?.status === "uploaded" ? "Uploaded"
                : upload?.status === "error" ? "Upload failed"
                  : upload?.status === "queued" ? "Queued"
                    : file ? "Ready to upload" : "Saved";
            return (
              <div key={photo} className="min-w-0 overflow-hidden rounded-md border bg-white">
                <div className="relative aspect-square bg-slate-100">
                  <img
                    src={photo}
                    alt={file?.name ?? (index === 0 ? "Cover photo" : `Service photo ${index + 1}`)}
                    className="size-full object-cover"
                  />
                  {index === 0 && (
                    <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-[#3c6355]">
                      <Star className="size-3 fill-current" />
                      Cover
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/55 p-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-white hover:bg-white/20 hover:text-white"
                      disabled={busy || index === 0}
                      onClick={() => onMove(index, -1)}
                      aria-label="Move photo earlier"
                    >
                      ←
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-white hover:bg-white/20 hover:text-white"
                      onClick={() => onRemove(index)}
                      disabled={busy}
                      aria-label="Remove photo"
                    >
                      <Trash2 />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-white hover:bg-white/20 hover:text-white"
                      disabled={busy || index === photos.length - 1}
                      onClick={() => onMove(index, 1)}
                      aria-label="Move photo later"
                    >
                      →
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 p-2 text-xs">
                  {file && <p className="truncate font-medium" title={file.name}>{file.name}</p>}
                  <p role="status" className={upload?.status === "error" ? "text-red-700" : "text-slate-600"}>
                    {statusLabel}
                  </p>
                  {upload?.status === "uploading" && (
                    <progress className="h-1.5 w-full accent-[#3c6355]" value={progress} max={100} aria-label={`Upload progress for ${file?.name ?? `photo ${index + 1}`}`} />
                  )}
                  {upload?.status === "error" && (
                    <>
                      <p className="break-words text-red-700">{upload.error}</p>
                      {onRetry && (
                        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onRetry(photo)} aria-label={`Retry ${file?.name ?? `photo ${index + 1}`}`}>
                          Retry
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 whitespace-pre-line text-sm text-red-700">
          {error}
        </p>
      )}
      {photos.length > 1 && (
        <p className="mt-2 text-xs text-slate-500">
          The first photo is shown as the cover in customer previews.
        </p>
      )}
    </div>
  );
}
