"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Check,
  Heart,
  Trash2,
  X,
} from "lucide-react";

import { SiteHeader } from "@/components/landing/site-header";
import { BusinessCard } from "@/components/landing/business-card";
import { mockBusinesses } from "@/components/landing/mock-businesses";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { useFavoritesStore } from "@/features/favorites/store/favorites.store";

type ComparisonCategory =
  | "Veterinary"
  | "Grooming"
  | "Boarding"
  | "Training"
  | "Pet Supplies";

const categoryAliases: Record<string, ComparisonCategory> = {
  veterinary: "Veterinary",
  "vet clinics": "Veterinary",
  "vet clinic": "Veterinary",
  grooming: "Grooming",
  boarding: "Boarding",
  training: "Training",
  "pet supplies": "Pet Supplies",
};

const comparisonAmenities: Record<ComparisonCategory, string[]> = {
  Veterinary: ["Consultation rooms", "Vaccination support", "Pet-safe waiting area"],
  Grooming: ["Bath and drying station", "Nail care", "Coat finishing"],
  Boarding: ["Supervised play", "Daily updates", "Overnight care"],
  Training: ["Indoor training area", "Leash skills", "Positive reinforcement"],
  "Pet Supplies": ["Food and treats", "Care essentials", "Pickup support"],
};

const comparisonHours: Record<ComparisonCategory, string> = {
  Veterinary: "Mon–Sat · 8:00 AM–6:00 PM",
  Grooming: "Tue–Sun · 9:00 AM–7:00 PM",
  Boarding: "Daily · 7:00 AM–9:00 PM",
  Training: "Mon–Sat · 9:00 AM–6:00 PM",
  "Pet Supplies": "Daily · 10:00 AM–8:00 PM",
};

function normalizeCategory(value: string): ComparisonCategory {
  const key = value.trim().toLowerCase();
  return categoryAliases[key] ?? "Pet Supplies";
}

function businessCategories(
  business: (typeof mockBusinesses)[number],
): ComparisonCategory[] {
  return Array.from(
    new Set([
      normalizeCategory(business.services),
      ...(business.servicesOffered ?? []).map((service) =>
        normalizeCategory(service.category),
      ),
    ]),
  );
}

function getSharedCategories(
  businesses: (typeof mockBusinesses)[number][],
): ComparisonCategory[] {
  if (!businesses.length) return [];
  return businessCategories(businesses[0]).filter((category) =>
    businesses.every((business) => businessCategories(business).includes(category)),
  );
}

function getComparableService(
  business: (typeof mockBusinesses)[number],
  category: ComparisonCategory,
) {
  const matching = (business.servicesOffered ?? []).filter(
    (service) => normalizeCategory(service.category) === category,
  );
  const numericPrices = matching
    .map((service) => Number(service.price.replace(/[^0-9.]/g, "")))
    .filter((price) => Number.isFinite(price) && price > 0);
  const lowestPrice = numericPrices.length
    ? `₱${Math.min(...numericPrices).toLocaleString()}`
    : business.priceStarts;

  return {
    titles: matching.length
      ? matching.map((service) => service.title)
      : [business.services],
    price: lowestPrice || "Contact provider",
  };
}

export default function WishlistPage() {
  const favoriteSlugs = useFavoritesStore((state) => state.favoriteSlugs);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const businesses = mockBusinesses.filter(
    (business) => business.slug && favoriteSlugs.includes(business.slug),
  );
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [comparisonCategory, setComparisonCategory] =
    useState<ComparisonCategory>("Veterinary");
  const [comparisonNotice, setComparisonNotice] = useState("");

  const selectedBusinesses = useMemo(
    () =>
      businesses.filter(
        (business) => business.slug && selectedSlugs.includes(business.slug),
      ),
    [businesses, selectedSlugs],
  );
  const sharedCategories = getSharedCategories(selectedBusinesses);
  const activeCategory = sharedCategories.includes(comparisonCategory)
    ? comparisonCategory
    : sharedCategories[0];

  const removeFromWishlist = (slug: string) => {
    if (!favoriteSlugs.includes(slug)) return;
    toggleFavorite(slug);
    setSelectedSlugs((current) => current.filter((item) => item !== slug));
    toast({
      title: "Removed from your wishlist.",
      description: "The business was removed from your saved list.",
      variant: "success",
    });
  };

  const toggleComparison = (slug: string) => {
    setComparisonNotice("");
    setSelectedSlugs((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug],
    );
  };

  const compareSelected = () => {
    if (selectedBusinesses.length < 2) {
      setComparisonNotice("Select at least two saved businesses to compare.");
      return;
    }
    if (!sharedCategories.length) {
      setComparisonNotice(
        "Choose businesses that share at least one service category.",
      );
      return;
    }
    setComparisonCategory(sharedCategories[0]);
    setComparisonNotice("");
    setComparisonOpen(true);
  };

  const removeFromComparison = (slug: string) => {
    setSelectedSlugs((current) => current.filter((item) => item !== slug));
    if (selectedBusinesses.length <= 2) setComparisonOpen(false);
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
              Keep the pet-service businesses you want to compare or contact later.
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
          <>
            <div className="mt-8 flex flex-col gap-3 rounded-xl border border-[#dfe8e2] bg-[#f7faf8] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-[#3c6355]">Compare saved businesses</p>
                <p className="mt-1 text-sm text-[#69736d]">
                  Select two or more providers offering the same service category.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-[#69736d]">
                  {selectedBusinesses.length} selected
                </span>
                <Button
                  type="button"
                  disabled={selectedBusinesses.length < 2}
                  onClick={compareSelected}
                  className="gap-2 bg-[#3c6355] text-white hover:bg-[#2f5044]"
                >
                  <ArrowLeftRight className="size-4" />
                  Compare selected
                </Button>
                {selectedBusinesses.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setSelectedSlugs([]);
                      setComparisonNotice("");
                    }}
                    className="text-[#3c6355]"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
            {comparisonNotice && (
              <p
                role="alert"
                className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800"
              >
                {comparisonNotice}
              </p>
            )}

            <div className="mt-6 grid grid-cols-1 gap-5 min-[560px]:grid-cols-2 xl:grid-cols-3">
              {businesses.map((business) => {
                const slug = business.slug as string;
                const isSelected = selectedSlugs.includes(slug);
                return (
                  <BusinessCard
                    key={slug}
                    {...business}
                    actions={
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          onClick={() => toggleComparison(slug)}
                          aria-pressed={isSelected}
                          className={`h-9 flex-1 gap-1.5 px-2 text-xs ${
                            isSelected
                              ? "bg-[#3c6355] text-white hover:bg-[#2f5044]"
                              : "border-[#cbdad1] text-[#3c6355]"
                          }`}
                        >
                          {isSelected ? (
                            <Check className="size-3.5" />
                          ) : (
                            <ArrowLeftRight className="size-3.5" />
                          )}
                          {isSelected ? "Selected" : "Compare"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeFromWishlist(slug)}
                          className="h-9 gap-1 px-2 text-xs text-[#8d5d4c] hover:bg-[#fff4ef] hover:text-[#8d5d4c]"
                        >
                          <Trash2 className="size-3.5" />
                          Remove
                        </Button>
                      </div>
                    }
                  />
                );
              })}
            </div>
          </>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-[#d8d8d8] bg-[#faf9f6] px-6 py-14 text-center">
            <Heart className="mx-auto size-10 text-[#3c6355]" />
            <h2 className="mt-4 text-xl font-semibold">Your wishlist is empty</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#777b78]">
              Save businesses from the heart button on any card and they will appear here.
            </p>
            <Button asChild className="mt-6 bg-[#3c6355] text-white hover:bg-[#2f5044]">
              <Link href="/#browse">Explore pet services</Link>
            </Button>
          </div>
        )}
      </section>

      <Dialog open={comparisonOpen} onOpenChange={setComparisonOpen}>
        <DialogContent className="max-w-6xl p-4 sm:p-6">
          <DialogClose onClick={() => setComparisonOpen(false)} />
          <div className="pr-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c5714e]">
              Wishlist comparison
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#3c6355]">
              Compare businesses
            </h2>
            <p className="mt-2 text-sm text-[#69736d]">
              Compare providers side by side before requesting an appointment.
            </p>
          </div>

          {sharedCategories.length > 1 && (
            <div className="mt-5 max-w-sm">
              <label htmlFor="comparison-category" className="text-sm font-semibold">
                Service category
              </label>
              <Select
                value={activeCategory}
                onValueChange={(value) =>
                  setComparisonCategory(value as ComparisonCategory)
                }
              >
                <SelectTrigger id="comparison-category" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sharedCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {activeCategory ? (
            <div className="mt-6 overflow-x-auto pb-2">
              <div className="grid min-w-[700px] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {selectedBusinesses.map((business) => {
                  const slug = business.slug as string;
                  const comparable = getComparableService(business, activeCategory);
                  return (
                    <article
                      key={slug}
                      className="overflow-hidden rounded-xl border border-[#dfe8e2] bg-white"
                    >
                      <div className="relative h-32 bg-[#eaf0ed]">
                        {business.images?.[0]?.src ? (
                          <Image
                            src={business.images[0].src}
                            alt={`${business.businessName} profile`}
                            fill
                            sizes="240px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="grid h-full place-items-center text-2xl font-bold text-[#3c6355]">
                            {business.businessName.slice(0, 1)}
                          </div>
                        )}
                      </div>
                      <div className="space-y-4 p-4">
                        <div>
                          <h3 className="font-semibold">{business.businessName}</h3>
                          <p className="mt-1 text-xs text-[#69736d]">
                            {activeCategory} · {business.rating}
                          </p>
                        </div>
                        <div className="grid gap-3 text-sm">
                          <div>
                            <p className="text-xs text-[#8d918f]">Matching services</p>
                            <p className="font-medium">{comparable.titles.join(", ")}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#8d918f]">Starting price</p>
                            <p className="font-semibold text-[#3c6355]">{comparable.price}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#8d918f]">Amenities</p>
                            <p>{comparisonAmenities[activeCategory].join(" · ")}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#8d918f]">Availability</p>
                            <p>{comparisonHours[activeCategory]}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => removeFromComparison(slug)}
                            className="gap-1 px-0 text-xs text-[#69736d]"
                          >
                            <X className="size-3.5" /> Remove
                          </Button>
                          <Button asChild size="sm" className="bg-[#3c6355] text-white hover:bg-[#2f5044]">
                            <Link href={`/business-profile/${slug}`}>View profile</Link>
                          </Button>
                          <Button asChild size="sm" variant="outline" className="border-[#cbdad1] text-[#3c6355]">
                            <Link href={`/business-profile/${slug}/request-appointment`}>
                              Request appointment
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
              These businesses do not share a service category. Return to your wishlist
              and select providers with matching services.
            </div>
          )}

          <div className="mt-5 flex justify-end border-t border-[#e8ece9] pt-4">
            <Button type="button" variant="outline" onClick={() => setComparisonOpen(false)}>
              Back to wishlist
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
