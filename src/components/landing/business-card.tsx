"use client";

import { ArrowLeft, ArrowRight, ArrowUpRight, Heart, Star } from "lucide-react";
import { useState } from "react";

const cardImages = [
  { src: "/kalinga-waterfront.png", position: "center" },
  { src: "/kalinga-waterfront.png", position: "25% center" },
  { src: "/kalinga-waterfront.png", position: "75% center" },
];

export function BusinessCard() {
  const [activeImage, setActiveImage] = useState(0);
  const [saved, setSaved] = useState(false);

  const moveImage = (direction: number) => {
    setActiveImage((current) => (current + direction + cardImages.length) % cardImages.length);
  };

  return (
    <article className="group min-w-0 overflow-hidden rounded-xl border border-[#e0e0dd] bg-white shadow-[0_2px_5px_rgba(20,20,20,0.15)] transition-shadow hover:shadow-[0_4px_10px_rgba(20,20,20,0.18)]">
      <div className="relative aspect-[1.36] overflow-hidden bg-[#d5e9e6]">
        <img src={cardImages[activeImage].src} alt={`Kalinga Animal Hospital view ${activeImage + 1}`} className="block h-full w-full object-cover" style={{ objectPosition: cardImages[activeImage].position }} />
        <button type="button" onClick={() => moveImage(-1)} aria-label="Previous card image" className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#3c6355] opacity-100 shadow-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"><ArrowLeft size={14} /></button>
        <button type="button" onClick={() => moveImage(1)} aria-label="Next card image" className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#3c6355] opacity-100 shadow-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"><ArrowRight size={14} /></button>
        <button type="button" onClick={() => setSaved((current) => !current)} aria-label={saved ? "Remove from favorites" : "Save Kalinga Animal Hospital"} aria-pressed={saved} className={`absolute right-3 top-3 flex size-10 items-center justify-center rounded-full border bg-white/95 shadow-sm transition-colors ${saved ? "border-[#c5714e] text-[#c5714e]" : "border-[#3c6355] text-[#3c6355]"}`}><Heart size={19} fill={saved ? "currentColor" : "none"} strokeWidth={1.5} /></button>
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/10 px-2 py-1"><span className="sr-only">Image {activeImage + 1} of {cardImages.length}</span>{cardImages.map((_, index) => <button type="button" key={index} aria-label={`Show image ${index + 1}`} aria-current={activeImage === index} onClick={() => setActiveImage(index)} className={`size-1.5 rounded-full transition-colors ${activeImage === index ? "bg-white" : "bg-white/55"}`} />)}</div>
      </div>
      <div className="space-y-2.5 p-4 sm:p-4.5">
        <p className="text-[10px] text-[#8d918f]">Lapu-Lapu City, Philippines</p>
        <h3 className="truncate text-sm font-medium text-[#242524]">Kalinga Animal Hospital</h3>
        <div className="flex items-center gap-1.5 text-xs text-[#9a9c9b]"><Star size={13} fill="#ffd000" strokeWidth={0} /><span>4.8 (23)</span><span className="text-[#d9d9d7]">•</span><span>Vet Clinics</span><ArrowUpRight className="ml-auto text-[#ff8b2c]" size={18} /></div>
        <p className="text-xs text-[#8d918f]">Starts at <span className="font-semibold text-[#242524]">Php 1,500</span></p>
      </div>
    </article>
  );
}

