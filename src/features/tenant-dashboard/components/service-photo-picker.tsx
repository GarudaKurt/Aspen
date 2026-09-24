"use client";

import { ImagePlus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function ServicePhotoPicker({ photos, error, onAdd, onRemove, onMove }: { photos: string[]; error?: string; onAdd: (files: FileList) => void; onRemove: (index: number) => void; onMove: (index: number, direction: -1 | 1) => void }) {
  return <div>
    <Label htmlFor="service-photos">Service photos <span className="font-normal text-slate-400">(optional, up to 6)</span></Label>
    <label htmlFor="service-photos" className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:border-[#3c6355] hover:bg-[#f5faf7]">
      <ImagePlus className="size-7 text-[#3c6355]" />
      <span className="mt-2 text-sm font-medium">Upload photos</span>
      <span className="mt-1 text-xs text-slate-500">JPG, JPEG, PNG, or WebP · up to 5 MB each</span>
      <input id="service-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => { if (event.target.files?.length) onAdd(event.target.files); event.currentTarget.value = ""; }} />
    </label>
    {photos.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{photos.map((photo, index) => <div key={photo} className="group relative aspect-square overflow-hidden rounded-md border bg-slate-100">
      <img src={photo} alt={index === 0 ? "Cover photo" : "Service photo"} className="size-full object-cover" />
      {index === 0 && <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-[#3c6355]"><Star className="size-3 fill-current" />Cover</span>}
      <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/55 p-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <Button type="button" variant="ghost" size="icon-sm" className="text-white hover:bg-white/20 hover:text-white" disabled={index === 0} onClick={() => onMove(index, -1)} aria-label="Move photo earlier">←</Button>
        <Button type="button" variant="ghost" size="icon-sm" className="text-white hover:bg-white/20 hover:text-white" onClick={() => onRemove(index)} aria-label="Remove photo"><Trash2 /></Button>
        <Button type="button" variant="ghost" size="icon-sm" className="text-white hover:bg-white/20 hover:text-white" disabled={index === photos.length - 1} onClick={() => onMove(index, 1)} aria-label="Move photo later">→</Button>
      </div>
    </div>)}</div>}
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    {photos.length > 1 && <p className="mt-2 text-xs text-slate-500">The first photo is shown as the cover in customer previews.</p>}
  </div>;
}
