"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { Dialog } from "@base-ui/react/dialog";
import { ArrowLeft, ArrowRight, Images, ImageOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBusinessInitials } from "@/features/tenant-dashboard/profile/business-initials";

type Collection = { photos: string[]; name: string; openPhoto: (index: number, trigger: HTMLButtonElement) => void };
const PhotoContext = createContext<Collection | null>(null);
function usePhotos() {
  const value = useContext(PhotoContext);
  if (!value) throw new Error("Business photos require a photo collection.");
  return value;
}

/** One accessible viewer shared by the cover tiles and Photos tab. */
export function BusinessPhotoCollection({ photos, name, children }: { photos: string[]; name: string; children: ReactNode }) {
  const [selected, setSelected] = useState<number | null>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const index = Math.min(selected ?? 0, Math.max(0, photos.length - 1));
  const move = (direction: number) => setSelected((index + direction + photos.length) % photos.length);
  return (
    <PhotoContext.Provider value={{ photos, name, openPhoto: (next, trigger) => {
      returnFocus.current = trigger;
      setSelected(next);
    } }}>
      {children}
      <Dialog.Root open={selected !== null && photos.length > 0} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-[90] bg-[#111613]" />
          <Dialog.Popup finalFocus={returnFocus} className="fixed inset-0 z-[91] flex h-[100dvh] flex-col bg-[#111613] text-white outline-none"
            onKeyDown={(event) => {
              if (photos.length > 1 && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
                event.preventDefault();
                move(event.key === "ArrowLeft" ? -1 : 1);
              }
            }}>
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-8">
              <div className="min-w-0">
                <Dialog.Title className="truncate text-sm font-semibold">{name}</Dialog.Title>
                <Dialog.Description className="mt-1 text-xs text-white/60">Business photos · Full image</Dialog.Description>
              </div>
              <Dialog.Close render={<Button type="button" variant="ghost" className="size-11 text-white hover:bg-white/10 hover:text-white" />} aria-label="Close photo viewer"><X className="size-5" /></Dialog.Close>
            </div>
            <div className="relative mx-3 my-3 min-h-0 flex-1 touch-pan-y sm:mx-20 sm:my-6"
              onTouchStart={(event) => { const touch = event.touches[0]; touchStart.current = { x: touch.clientX, y: touch.clientY }; }}
              onTouchCancel={() => { touchStart.current = null; }}
              onTouchEnd={(event) => {
                const start = touchStart.current;
                touchStart.current = null;
                if (!start || photos.length < 2) return;
                const touch = event.changedTouches[0];
                const distance = touch.clientX - start.x;
                if (Math.abs(distance) > 60 && Math.abs(distance) > Math.abs(touch.clientY - start.y)) move(distance < 0 ? 1 : -1);
              }}>
              {photos[index] && <PhotoImage key={photos[index]} src={photos[index]} alt={`${name} photo ${index + 1}`} full sizes="100vw" />}
            </div>
            <div className="flex shrink-0 items-center justify-center gap-6 border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {photos.length > 1 && <Button type="button" variant="ghost" className="size-11 rounded-full border border-white/20 text-white hover:bg-white/10 hover:text-white" aria-label="Previous photo" onClick={() => move(-1)}><ArrowLeft className="size-5" /></Button>}
              <p className="min-w-20 text-center text-sm tabular-nums" role="status" aria-live="polite">{index + 1} / {photos.length}</p>
              {photos.length > 1 && <Button type="button" variant="ghost" className="size-11 rounded-full border border-white/20 text-white hover:bg-white/10 hover:text-white" aria-label="Next photo" onClick={() => move(1)}><ArrowRight className="size-5" /></Button>}
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </PhotoContext.Provider>
  );
}

/** Reserve the frame while loading. Portrait images stay uncropped in tiles. */
function PhotoImage({ src, alt, sizes, full = false, eager = false }: { src: string; alt: string; sizes: string; full?: boolean; eager?: boolean }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [portrait, setPortrait] = useState(false);
  return <>
    {status === "loading" && <span className={`absolute inset-0 grid place-items-center ${full ? "text-white/60" : "bg-[#edf1ee] text-[#63736a]"}`} role="status"><span className="text-xs">Loading photo…</span></span>}
    {status === "error" ? <span className={`absolute inset-0 flex flex-col items-center justify-center gap-2 ${full ? "text-white/70" : "bg-[#edf1ee] text-[#63736a]"}`}><ImageOff className="size-6" aria-hidden="true" /><span className="text-xs">Photo unavailable</span></span> : <Image
      src={src} alt={alt} fill unoptimized sizes={sizes} loading={eager || full ? "eager" : "lazy"}
      className={`${full || portrait ? "object-contain" : "object-cover"} object-center transition-opacity duration-200 motion-reduce:transition-none ${status === "ready" ? "opacity-100" : "opacity-0"}`}
      onLoad={(event) => { setPortrait(event.currentTarget.naturalHeight > event.currentTarget.naturalWidth); setStatus("ready"); }}
      onError={() => setStatus("error")}
    />}
  </>;
}

export function BusinessPhotoCover() {
  const { photos, name, openPhoto } = usePhotos();
  if (!photos.length) return (
    <div className="flex h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-[#e1e7e3] bg-[#f2f5f3] text-[#3c6355] sm:h-[280px] lg:h-[320px]">
      <span className="text-4xl font-semibold" aria-label={`${name} initials`}>{getBusinessInitials(name)}</span>
      <p className="text-sm text-[#63736a]">Business photos coming soon</p>
    </div>
  );
  const tiles = photos.slice(0, 3);
  return (
    <section aria-label={`${name} photo gallery`} className="relative">
      <div className={`grid h-[220px] gap-1.5 overflow-hidden rounded-2xl bg-[#edf1ee] sm:h-[280px] lg:h-[320px] ${tiles.length > 1 ? "sm:grid-cols-[2fr_1fr] sm:grid-rows-2" : "grid-cols-1"}`}>
        {tiles.map((src, index) => (
          <button key={src} type="button" onClick={(event) => openPhoto(index, event.currentTarget)} aria-label={`Open ${index === 0 ? "cover photo" : `photo ${index + 1}`} of ${name}`}
            className={`relative min-h-0 min-w-0 overflow-hidden outline-none transition-[filter] hover:brightness-95 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3c6355] motion-reduce:transition-none ${index === 0 ? "row-span-2" : `hidden sm:block ${tiles.length === 2 ? "row-span-2" : ""}`}`}>
            <PhotoImage src={src} alt={`${name} photo ${index + 1}`} eager={index === 0} sizes={index === 0 ? "(min-width: 1200px) 750px, (min-width: 640px) 66vw, 100vw" : "(min-width: 1200px) 370px, 33vw"} />
          </button>
        ))}
      </div>
      <Button type="button" variant="outline" onClick={(event) => openPhoto(0, event.currentTarget)} className="absolute bottom-3 right-3 h-10 gap-2 rounded-lg border-white/70 bg-white px-3 text-xs text-[#263b30] shadow-sm hover:bg-[#f2f5f3] sm:bottom-4 sm:right-4 sm:text-sm">
        <Images className="size-4" aria-hidden="true" />{photos.length > 1 ? `View all ${photos.length} photos` : "View full photo"}
      </Button>
    </section>
  );
}

export function BusinessPhotoGrid() {
  const { photos, name, openPhoto } = usePhotos();
  if (!photos.length) return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-[#777b78]">This business has not added any photos yet.</p>;
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
    {photos.map((src, index) => <button key={src} type="button" aria-label={`View photo ${index + 1} of ${name}`} onClick={(event) => openPhoto(index, event.currentTarget)} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#edf1ee] outline-none transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[#3c6355] motion-reduce:transition-none">
      <PhotoImage src={src} alt={`${name} photo ${index + 1}`} sizes="(min-width: 1200px) 260px, (min-width: 640px) 33vw, 50vw" />
    </button>)}
  </div>;
}
