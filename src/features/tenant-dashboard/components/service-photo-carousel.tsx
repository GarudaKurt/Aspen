"use client";

import { useState, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ServicePhotoCarousel({ photos, title }: { photos: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);
  const hasPhotos = photos.length > 0;
  const move = (direction: -1 | 1) => setIndex((current) => (current + direction + photos.length) % photos.length);
  const touchStart = (event: TouchEvent<HTMLDivElement>) => setStartX(event.touches[0]?.clientX ?? null);
  const touchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (startX === null || photos.length < 2) return;
    const distance = (event.changedTouches[0]?.clientX ?? startX) - startX;
    if (Math.abs(distance) > 40) move(distance < 0 ? 1 : -1);
    setStartX(null);
  };

  return <div className="relative h-48 overflow-hidden bg-[#e8f5ef]" onTouchStart={touchStart} onTouchEnd={touchEnd}>
    {hasPhotos ? <img src={photos[index]} alt={title} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-5xl font-bold text-[#3c6355]">{title.charAt(0)}</div>}
    {photos.length > 1 && <>
      <Button type="button" variant="secondary" size="icon-sm" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90" onClick={() => move(-1)} aria-label="Previous photo"><ChevronLeft /></Button>
      <Button type="button" variant="secondary" size="icon-sm" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90" onClick={() => move(1)} aria-label="Next photo"><ChevronRight /></Button>
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/30 px-2 py-1">{photos.map((photo, photoIndex) => <button key={photo} type="button" aria-label={`Show photo ${photoIndex + 1}`} aria-current={photoIndex === index} onClick={() => setIndex(photoIndex)} className={`size-1.5 rounded-full ${photoIndex === index ? "bg-white" : "bg-white/50"}`} />)}</div>
    </>}
  </div>;
}
