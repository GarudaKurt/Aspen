"use client";

import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { ArrowLeft, ArrowRight, ArrowUpRight, Heart, Star } from "lucide-react";
import { useRef, useState } from "react";
import Link from "next/link";
import type { PointerEvent } from "react";

const cardImages = [
  { src: "/kalinga-anima-hospital.png", position: "object-center" },
  { src: "/kalinga-anima-hospital.png", position: "object-[25%_center]" },
  { src: "/kalinga-anima-hospital.png", position: "object-[75%_center]" },
];

export function BusinessCard() {
  const [activeImage, setActiveImage] = useState(0);
  const [saved, setSaved] = useState(false);
  const pointerStart = useRef<number | null>(null);

  const moveImage = (direction: number) => {
    setActiveImage(
      (current) =>
        (current + direction + cardImages.length) % cardImages.length,
    );
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
    <Card className="group min-w-0 overflow-hidden rounded-xl border border-[#e0e0dd] bg-white shadow-[0_2px_5px_rgba(20,20,20,0.15)] transition-shadow hover:shadow-[0_4px_10px_rgba(20,20,20,0.18)]">
      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          pointerStart.current = null;
        }}
        className="relative aspect-[1.35] cursor-grab touch-none overflow-visible bg-[#d5e9e6] active:cursor-grabbing"
      >
        <Image
          draggable={false}
          src={cardImages[activeImage].src}
          alt={`Kalinga Animal Hospital view ${activeImage + 1}`}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 560px) 50vw, 100vw"
          className={`select-none object-cover transition-[object-position] duration-300 ${cardImages[activeImage].position}`}
        />
        <Button
          variant="ghost"
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => moveImage(-1)}
          aria-label="Previous card image"
          className="absolute left-3 top-1/2 hidden size-8 -translate-y-1/2 items-center justify-center bg-transparent text-white opacity-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] transition-none transform-none hover:transform-none active:transform-none focus:transform-none hover:bg-white hover:text-[#3c6355] focus-visible:opacity-100 lg:flex lg:group-hover:opacity-100"
        >
          <ArrowLeft size={15} />
        </Button>
        <Button
          variant="ghost"
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => moveImage(1)}
          aria-label="Next card image"
          className="absolute right-3 top-1/2 hidden size-8 -translate-y-1/2 items-center justify-center bg-transparent text-white opacity-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] transition-none transform-none hover:transform-none active:transform-none focus:transform-none hover:bg-white hover:text-[#3c6355] focus-visible:opacity-100 lg:flex lg:group-hover:opacity-100"
        >
          <ArrowRight size={15} />
        </Button>
        <Button
          variant="ghost"
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onClick={() => setSaved((current) => !current)}
          aria-label={
            saved ? "Remove from favorites" : "Save Kalinga Animal Hospital"
          }
          aria-pressed={saved}
          className={`absolute bottom-[-15px] right-[2px] z-10 flex size-8 items-center justify-center rounded-full border border-[#3c6355] bg-white/95 text-[#3c6355] shadow-sm transition-colors duration-200 transform-none active:transform-none focus:transform-none hover:bg-white ${saved ? "bg-[#3c6355] text-white" : ""}`}
        >
          <Heart
            size={12}
            fill={saved ? "currentColor" : "none"}
            strokeWidth={1.8}
          />
        </Button>
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/10 px-2 py-1">
          <span className="sr-only">
            Image {activeImage + 1} of {cardImages.length}
          </span>
          {cardImages.map((_, index) => (
            <Button
              variant="ghost"
              type="button"
              key={index}
              aria-label={`Show image ${index + 1}`}
              aria-current={activeImage === index}
              onClick={() => setActiveImage(index)}
              className={`size-1.5 rounded-full transition-colors ${activeImage === index ? "bg-white" : "bg-white/55"}`}
            />
          ))}
        </div>
      </div>
      <div className="space-y-1 p-2 sm:space-y-1.5 sm:p-2">
        <p className="text-[10px] text-[#8d918f]">
          Lapu-Lapu City, Philippines
        </p>
        <h3 className="truncate text-base font-medium text-[#242524]">
          Kalinga Animal Hospital
        </h3>
        <div className="flex items-center gap-2 whitespace-nowrap text-sm text-[#9a9c9b]">
          <Star size={13} fill="#ffd000" strokeWidth={0} />
          <span>4.8 (23)</span>
          <span className="text-[#d9d9d7]">•</span>
          <span>Vet Clinics</span>
          <Link
            href={"#"}
            aria-label="View Kalinga Animal Hospital details"
            className="ml-auto flex shrink-0 items-center justify-center rounded-full text-[#ff8b2c] transition-colors hover:text-[#e67a1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8b2c]/50"
          >
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <p className="text-sm leading-5 text-[#8d918f]">
          Starts at{" "}
          <span className="font-semibold text-[#242524]">Php 1,500</span>
        </p>
      </div>
    </Card>
  );
}
