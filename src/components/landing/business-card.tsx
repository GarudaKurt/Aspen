"use client";

import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { ArrowLeft, ArrowRight, ArrowUpRight, Heart, Star } from "lucide-react";
import { useRef, useState } from "react";
import Link from "next/link";
import type { PointerEvent } from "react";

export type BusinessCardImage = {
  src: string;
  position?: string;
  alt?: string;
};

export interface BusinessCardProps {
  location: string;
  businessName: string;
  rating: string;
  services: string;
  priceStarts: string;
  slug?: string;
  images?: BusinessCardImage[];
  href?: string;
  isLoading?: boolean;
}

export function BusinessCardSkeleton() {
  return (
    <Card
      aria-label="Loading business card"
      aria-busy="true"
      className="min-w-0 overflow-hidden rounded-xl border border-[#e0e0dd] bg-white shadow-[0_2px_5px_rgba(20,20,20,0.15)]"
    >
      <Skeleton className="aspect-[1.35] w-full rounded-none" />
      <div className="space-y-2 p-2 sm:space-y-2.5 sm:p-2">
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-5 w-4/5" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-3 rounded-full" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-5 w-2/5" />
      </div>
    </Card>
  );
}

export function BusinessCard({
  location,
  businessName,
  rating,
  services,
  priceStarts,
  slug,
  images = [],
  href = "#",
  isLoading = false,
}: BusinessCardProps) {
  const cardImages = images;
  const hasImages = cardImages.length > 0;
  const [activeImage, setActiveImage] = useState(0);
  const [saved, setSaved] = useState(false);
  const pointerStart = useRef<number | null>(null);

  if (isLoading) {
    return <BusinessCardSkeleton />;
  }

  const moveImage = (direction: number) => {
    if (!hasImages) return;

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
    if (hasImages && Math.abs(distance) >= 40) {
      moveImage(distance > 0 ? -1 : 1);
    }
    pointerStart.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const currentImage = cardImages[activeImage];

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
        {currentImage && (
          <Image
            draggable={false}
            src={currentImage.src}
            alt={`${currentImage.alt ?? businessName} view ${activeImage + 1}`}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 560px) 50vw, 100vw"
            className={`select-none rounded-sm object-cover transition-[object-position] duration-300 ${currentImage.position ?? ""}`}
          />
        )}
        {hasImages && (
          <>
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
          </>
        )}
        <Button
          variant="ghost"
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onClick={() => setSaved((current) => !current)}
          aria-label={
            saved
              ? `Remove ${businessName} from favorites`
              : `Save ${businessName}`
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
        {hasImages && (
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
        )}
      </div>
      <div className="space-y-1 p-2 sm:space-y-1.5 sm:p-2">
        <p className="text-[10px] text-[#8d918f]">{location}</p>
        <h3 className="truncate text-base font-medium text-[#242524]">
          {businessName}
        </h3>
        <div className="flex items-center gap-2 whitespace-nowrap text-sm text-[#9a9c9b]">
          <Star size={13} fill="#ffd000" strokeWidth={0} />
          <span>{rating}</span>
          <span className="text-[#d9d9d7]">•</span>
          <span>{services}</span>
          <Link
            href={slug ? `/business-profile/${slug}` : href}
            aria-label={`View ${businessName} details`}
            className="ml-auto flex shrink-0 items-center justify-center rounded-full text-[#ff8b2c] transition-colors hover:text-[#e67a1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8b2c]/50"
          >
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <p className="text-sm leading-5 text-[#8d918f]">
          Starts at{" "}
          <span className="font-semibold text-[#242524]">{priceStarts}</span>
        </p>
      </div>
    </Card>
  );
}
