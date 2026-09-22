"use client";

import { ArrowUpRight, Heart, Star } from "lucide-react";
import { useRef, useState } from "react";
import type { PointerEvent } from "react";

const cardImages = [
  { src: "/kalinga-waterfront.png", position: "center" },
  { src: "/kalinga-waterfront.png", position: "25% center" },
  { src: "/kalinga-waterfront.png", position: "75% center" },
];

export function BusinessCard() {
  const [activeImage, setActiveImage] = useState(0);
  const [saved, setSaved] = useState(false);
  const pointerStart = useRef<number | null>(null);

  const moveImage = (direction: number) => {
    setActiveImage((current) => (current + direction + cardImages.length) % cardImages.length);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerStart.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStart.current === null) return;
    const distance = event.clientX - pointerStart.current;
    if (Math.abs(distance) >= 40) moveImage(distance > 0 ? -1 : 1);
    pointerStart.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <article className="group min-w-0 overflow-hidden rounded-xl border border-[#e0e0dd] bg-white shadow-[0_2px_5px_rgba(20,20,20,0.15)] transition-shadow hover:shadow-[0_4px_10px_rgba(20,20,20,0.18)]">
      <div onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerCancel={() => { pointerStart.current = null; }} className="relative aspect-[1.22] cursor-grab touch-none overflow-hidden bg-[#d5e9e6] active:cursor-grabbing">
        <img draggable={false} src={cardImages[activeImage].src} alt={`Kalinga Animal Hospital view ${activeImage + 1}`} className="block h-full w-full select-none object-cover transition-[object-position] duration-300" style={{ objectPosition: cardImages[activeImage].position }} />
        <button type="button" onClick={() => setSaved((current) => !current)} aria-label={saved ? "Remove from favorites" : "Save Kalinga Animal Hospital"} aria-pressed={saved} className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full border border-transparent bg-transparent text-transparent"><Heart size={19} aria-hidden="true" /></button>
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/10 px-2 py-1"><span className="sr-only">Image {activeImage + 1} of {cardImages.length}</span>{cardImages.map((_, index) => <button type="button" key={index} aria-label={`Show image ${index + 1}`} aria-current={activeImage === index} onClick={() => setActiveImage(index)} className={`size-1.5 rounded-full transition-colors ${activeImage === index ? "bg-white" : "bg-white/55"}`} />)}</div>
      </div>
      <div className="min-h-[156px] space-y-3 p-5 sm:min-h-[168px]">
        <p className="text-[10px] text-[#8d918f]">Lapu-Lapu City, Philippines</p>
        <h3 className="truncate text-base font-medium text-[#242524]">Kalinga Animal Hospital</h3>
        <div className="flex items-center gap-2 text-sm text-[#9a9c9b]"><Star size={14} fill="#ffd000" strokeWidth={0} /><span>4.8 (23)</span><span className="text-[#d9d9d7]">•</span><span>Vet Clinics</span><ArrowUpRight className="ml-auto text-[#ff8b2c]" size={19} /></div>
        <p className="text-sm text-[#8d918f]">Starts at <span className="font-semibold text-[#242524]">Php 1,500</span></p>
      </div>
    </article>
  );
}

