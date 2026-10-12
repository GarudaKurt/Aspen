"use client";

import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";

import { SiteHeader } from "@/components/landing/site-header";
import { BusinessCard } from "@/components/landing/business-card";
import { mockBusinesses } from "@/components/landing/mock-businesses";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useFavoritesStore } from "@/features/favorites/store/favorites.store";

export default function WishlistPage() {
  const favoriteSlugs = useFavoritesStore((state) => state.favoriteSlugs);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const businesses = mockBusinesses.filter(
    (business) => business.slug && favoriteSlugs.includes(business.slug),
  );

  const removeFromWishlist = (slug: string) => {
    if (!favoriteSlugs.includes(slug)) return;

    toggleFavorite(slug);
    toast({
      title: "Removed from your wishlist.",
      description: "The business was removed from your saved list.",
      variant: "success",
    });
  };

  return (
    <main className="min-h-screen bg-white text-[#171817]">
      <SiteHeader />
      <section className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-8 sm:py-12 lg:px-12 xl:px-20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c5714e]">
              Your saved businesses
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[#3c6355] sm:text-4xl">
              Wishlist
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[#777b78] sm:text-base">
              Keep the pet-service businesses you want to contact later.
            </p>
          </div>
          <Link
            href="/#browse"
            className="text-sm font-semibold text-[#3c6355] hover:underline"
          >
            Find more services
          </Link>
        </div>

        {businesses.length ? (
          <div className="mt-8 grid grid-cols-1 gap-5 min-[560px]:grid-cols-2 xl:grid-cols-3">
            {businesses.map((business) => {
              const slug = business.slug as string;

              return (
                <BusinessCard
                  key={slug}
                  {...business}
                  actions={
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeFromWishlist(slug)}
                      className="h-9 w-full gap-1 px-2 text-xs text-[#8d5d4c] hover:bg-[#fff4ef] hover:text-[#8d5d4c]"
                    >
                      <Trash2 className="size-3.5" />
                      Remove from wishlist
                    </Button>
                  }
                />
              );
            })}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-[#d8d8d8] bg-[#faf9f6] px-6 py-14 text-center">
            <Heart className="mx-auto size-10 text-[#3c6355]" />
            <h2 className="mt-4 text-xl font-semibold">Your wishlist is empty</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#777b78]">
              Save businesses from the heart button on any card and they will appear here.
            </p>
            <Link
              href="/#browse"
              className={buttonVariants({
                className: "mt-6 bg-[#3c6355] text-white hover:bg-[#2f5044]",
              })}
            >
              Explore pet services
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
