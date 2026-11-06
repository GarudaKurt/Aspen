"use client";

import { AspenLogo } from "@/components/brand/aspen-logo";
import { SiteHeader } from "@/components/landing/site-header";
import { BusinessMap } from "@/components/landing/business-map";
import { cityCoordinates } from "@/components/landing/philippine-locations";
import Image from "next/image";
import { getBusinessInitials } from "@/features/tenant-dashboard/profile/business-initials";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Check,
  Heart,
  Maximize2,
  MessageCircle,
  Minimize2,
  Navigation,
  Share2,
  Star,
} from "lucide-react";
import type { BusinessLocationDetails } from "../location";
import {
  getBusinessCardLocationSummary,
  isValidBusinessCoordinates,
} from "../location";

import { Button } from "@/components/ui/button";
import { type BusinessAmenity } from "../amenities";
import { AmenityIcon } from "./amenity-icon";
import {
  getBusinessHoursDisplayRows,
  getBusinessHoursStatus,
  type BusinessHoursDay,
} from "../business-hours";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { useFavoritesStore } from "@/features/favorites/store/favorites.store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppointmentAuthGate } from "@/features/appointments/components/appointment-auth-gate";

export type TenantProfileData = {
  name: string;
  rating: string;
  reviews: string;
  favorites?: number;
  category: string;
  address: string;
  locationDetails?: BusinessLocationDetails;
  description?: string;
  serviceCoverage?: string[];
  servicesOffered?: Array<{
    id: string;
    title: string;
    category: string;
    description: string;
    price: string;
    photos?: string[];
  }>;
  coverPhoto?: string | null;
  photos?: string[];
  startingPrice?: number | null;
  businessHours?: BusinessHoursDay[];
  slug?: string;
  amenities?: BusinessAmenity[];
  verified?: boolean;
  /** Populated from the provider account's Supabase created_at field in production. */
  createdAt?: string;
};

type TenantProfileProps = {
  provider: TenantProfileData;
  preview?: boolean;
};

const tabs = ["Overview", "Photos", "Services", "Reviews"];

type ServiceItem = {
  id?: string;
  category?: string;
  title: string;
  description: string;
  price: string;
};

type ServiceCategory = {
  label: string;
  services: ServiceItem[];
};

export function BusinessProfile({
  provider,
  preview = false,
}: TenantProfileProps) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [mapExpanded, setMapExpanded] = useState(false);
  const isFavorite = useFavoritesStore((state) => state.isFavorite(provider.slug));
  const toggleFavoriteState = useFavoritesStore((state) => state.toggleFavorite);
  const toggleFavorite = () => {
    if (!provider.slug) return;
    const added = toggleFavoriteState(provider.slug);
    toast({
      title: added ? "Added to your wishlist." : "Removed from your wishlist.",
      description: provider.name,
      variant: "success",
    });
  };
  const coverPhoto = provider.coverPhoto ?? null;
  const schedule = provider.businessHours ?? [];
  const businessStatus = schedule.length ? getBusinessHoursStatus(schedule) : { open: false, label: "Hours unavailable" };
  const displayedAmenities = provider.amenities ?? [];
  const locationQuery = useMemo(() => {
    const details = provider.locationDetails;
    if (!details) return provider.address.trim();

    return [
      details.streetAddress,
      details.barangay,
      details.cityMunicipality,
      details.province,
      details.landmark,
    ]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(", ");
  }, [provider.address, provider.locationDetails]);
  const storedCoordinates = isValidBusinessCoordinates(
    provider.locationDetails?.coordinates,
  )
    ? provider.locationDetails.coordinates
    : null;

  const normalizedCity = provider.locationDetails?.cityMunicipality
    ?.trim()
    .toLowerCase();
  const cityFallbackCoordinates = normalizedCity
    ? cityCoordinates[normalizedCity] ?? null
    : null;
  const mapCoordinates = storedCoordinates ?? cityFallbackCoordinates;
  const mapAccuracy: "exact" | "city" | null = storedCoordinates
    ? "exact"
    : cityFallbackCoordinates
      ? "city"
      : null;
  const directionsDestination = storedCoordinates
    ? `${storedCoordinates[1]},${storedCoordinates[0]}`
    : locationQuery;
  const directionsHref = directionsDestination
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(directionsDestination)}`
    : null;
  const mapBusiness = useMemo(
    () => ({
      businessName: provider.name,
      location: provider.address,
      coordinates: mapCoordinates ?? undefined,
      locationAccuracy: mapAccuracy ?? undefined,
      locationDetails: provider.locationDetails && mapCoordinates
        ? { ...provider.locationDetails, coordinates: mapCoordinates }
        : provider.locationDetails,
      rating: provider.rating,
      services: provider.category,
      priceStarts: provider.startingPrice != null ? `₱${provider.startingPrice.toLocaleString("en-PH")}` : "",
      slug: provider.slug,
      images: provider.coverPhoto ? [{ src: provider.coverPhoto }] : [],
    }),
    [
      provider.address,
      mapCoordinates,
      mapAccuracy,
      provider.category,
      provider.coverPhoto,
      provider.locationDetails,
      provider.name,
      provider.rating,
      provider.startingPrice,
      provider.slug,
    ],
  );

  return (
    <>
    {!preview && <SiteHeader />}
    <main className="min-h-screen bg-white px-4 py-6 text-[#171817] sm:px-8 sm:py-10 lg:px-12">
      <div className="mx-auto max-w-[1120px]">
        <header className="flex items-center justify-between border-b border-[#d9d9d6] pb-4">
          <Link
            href="/#browse"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#242524] transition-colors hover:text-[#3c6355] sm:text-base"
          >
            <ArrowLeft size={16} />
            Back to search
          </Link>
          {preview && (
            <Link
              href="/"
              className="ml-auto inline-flex items-center gap-2 text-base font-medium tracking-wide"
            >
              <AspenLogo size={28} decorative />
              <span>Aspen</span>
            </Link>
          )}
        </header>

        <section className="pt-6 sm:pt-8">
          <div className="relative block h-[150px] overflow-hidden rounded-2xl bg-[#f0f0ef] sm:h-[190px] lg:h-[230px]">
            {coverPhoto ? (
              <Image
                src={coverPhoto}
                alt="Business cover photo"
                fill
                unoptimized
                sizes="(min-width: 1024px) 1120px, 100vw"
                className="object-cover"
              />
            ) : <div className="grid h-full place-items-center bg-[#edf3ef] text-5xl font-semibold text-[#3c6355]" aria-label={`${provider.name} initials`}>{getBusinessInitials(provider.name)}</div>}
          </div>
          <div className="mt-4 flex flex-col gap-4 sm:mt-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-bold sm:text-2xl lg:text-3xl">
                  {provider.name}
                </h1>
                {provider.verified && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#2768f5] px-2 py-0.5 text-[10px] font-semibold text-white">
                    <Check size={11} />
                    Verified
                  </span>
                )}
              </div>
              <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-[#838684] sm:text-xs">
                {provider.rating && <Star size={11} fill="#ffd000" strokeWidth={0} />}
                <span className="font-semibold text-[#242524]">
                  {provider.rating}
                </span>
                <span>·</span>
                <span>{provider.reviews}</span>
                <span>·</span>
                <Heart
                  size={11}
                  fill="currentColor"
                  className="text-[#3c6355]"
                />
                <span>
                  {isFavorite ? "Saved to wishlist" : "Save to wishlist"}
                </span>
                <span>·</span>
                <span>{provider.category}</span>
                <span>·</span>
                <span>{getBusinessCardLocationSummary(provider.locationDetails, provider.address)}</span>
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
              <Button
                variant="outline"
                size="icon"
                type="button"
                aria-label={
                  isFavorite ? "Remove from favorites" : "Add to favorites"
                }
                aria-pressed={isFavorite}
                onClick={toggleFavorite}
                className={`rounded-full border-[#d8dfdc] bg-white text-[#3c6355] hover:bg-[#eef3f0] ${isFavorite ? "bg-[#3c6355] text-white hover:bg-[#3c6355]" : ""}`}
              >
                <Heart size={17} fill={isFavorite ? "currentColor" : "none"} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                type="button"
                aria-label="Share provider"
                className="rounded-full border-[#d8dfdc] bg-white text-[#3c6355] hover:bg-[#eef3f0]"
              >
                <Share2 size={16} />
              </Button>
              <Button
                type="button"
                className="h-9 rounded-full bg-[#3c6355] px-3 text-xs text-white hover:bg-[#2f5044]"
              >
                <MessageCircle size={14} />
                Message
              </Button>
            </div>
          </div>
        </section>

        <Card className="mt-14 grid overflow-hidden rounded-2xl border-[#d8d8d5] bg-white shadow-none sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
          <Stat label="Status" value={businessStatus.label} />
          <Stat label="Starting price" value={provider.startingPrice != null ? `₱${provider.startingPrice.toLocaleString("en-PH")}` : "Contact for pricing"} />
          <Stat label="Services" value={String(provider.servicesOffered?.length ?? 0)} />
          <Stat
            label="Since"
            value={
              provider.createdAt
                ? `Listed since ${new Date(provider.createdAt).getFullYear()}`
                : "Listing date unavailable"
            }
          />
        </Card>

        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 border-b border-[#d8d8d5] px-2 sm:gap-x-10">
          {tabs.map((tab) => (
            <Button
              key={tab}
              variant="ghost"
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`relative h-10 shrink-0 rounded-none px-0 text-base font-medium text-[#171817] hover:bg-transparent hover:text-[#3c6355] sm:text-lg ${activeTab === tab ? "text-[#3c6355] after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-[#c5714e]" : ""}`}
            >
              {tab}
            </Button>
          ))}
        </div>

        <div className="grid gap-12 px-2 py-8 sm:px-4 lg:grid-cols-[1fr_260px] lg:gap-16">
          <div>
            {activeTab === "Overview" ? (
              <>
                <ProfileSection title="About">
                  <p className="max-w-[650px] text-sm font-semibold leading-5 text-[#929492] sm:text-base">
                    {provider.description || "No description provided."}
                  </p>
                </ProfileSection>

                <ProfileSection title="Amenities">
                  <div className="flex max-w-[700px] flex-wrap gap-4">
                    {displayedAmenities.length ? (
                      displayedAmenities.map((amenity) => (
                        <span
                          key={amenity.id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#dedbd8] px-3 py-1.5 text-xs font-semibold text-[#272927]"
                        >
                          <span className="text-[#3c6355]">
                            <AmenityIcon amenity={amenity} />
                          </span>
                          {amenity.label}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-[#929492]">
                        No amenities listed.
                      </p>
                    )}
                  </div>
                </ProfileSection>

                <ProfileSection title="Service coverage">
                  <div className="flex max-w-[700px] flex-wrap gap-3">
                    {!provider.serviceCoverage?.length && <p className="text-sm text-[#929492]">No active services listed.</p>}
                    {(
                      provider.serviceCoverage ?? []
                    ).map((coverage) => (
                      <span
                        key={coverage}
                        className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-600"
                      >
                        {coverage}
                      </span>
                    ))}
                  </div>
                </ProfileSection>

                <ProfileSection title="Business hours">
                  <BusinessHoursList schedule={schedule} />
                </ProfileSection>

                <ProfileSection title="Location">
                  <div className="max-w-[720px]">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm text-[#69736d]">
                        Explore the area around {provider.name}.
                      </p>
                      <div className="flex shrink-0 items-center gap-2">
                        {directionsHref && (
                          <a
                            href={directionsHref}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#d8dfdc] px-2.5 text-xs font-medium text-[#3c6355] outline-none transition-colors hover:bg-[#eef3f0] focus-visible:ring-2 focus-visible:ring-[#3c6355]/30 sm:px-3"
                          >
                            <Navigation className="size-4" aria-hidden="true" />
                            <span>Get directions</span>
                          </a>
                        )}
                        {mapCoordinates && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setMapExpanded((expanded) => !expanded)}
                            className="shrink-0 border-[#d8dfdc] text-[#3c6355] hover:bg-[#eef3f0]"
                            aria-pressed={mapExpanded}
                          >
                            {mapExpanded ? (
                              <Minimize2 className="size-4" />
                            ) : (
                              <Maximize2 className="size-4" />
                            )}
                            <span className="hidden sm:inline">
                              {mapExpanded ? "Minimize map" : "Maximize map"}
                            </span>
                            <span className="sr-only sm:hidden">
                              {mapExpanded ? "Minimize map" : "Maximize map"}
                            </span>
                          </Button>
                        )}
                      </div>
                    </div>
                    {mapAccuracy === "city" && (
                      <p className="mt-2 text-xs text-[#69736d]">
                        Showing the approximate {provider.locationDetails?.cityMunicipality ?? "city"} area. The exact storefront location has not been verified yet.
                      </p>
                    )}
                    {mapCoordinates ? (
                      <BusinessMap
                        businesses={[mapBusiness]}
                        selectedCity="All Cities"
                        compact
                        allowCityFallback={false}
                        mapHeight={mapExpanded ? "expanded" : "profile"}
                      />
                    ) : (
                      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-[#d8dfdc] bg-[#f7faf8] px-6 text-center sm:h-72 lg:h-80">
                        <p className="max-w-md text-sm leading-5 text-[#69736d]">
                          An exact map location is not available for this registered address yet. Use Get directions to navigate to the address.
                        </p>
                      </div>
                    )}
                  </div>
                </ProfileSection>
              </>
            ) : activeTab === "Photos" ? (
              <PhotoGallery providerName={provider.name} photos={provider.photos ?? []} />
            ) : activeTab === "Services" ? (
              <ServicesPanel categories={getServiceCategories(provider)} />
            ) : activeTab === "Reviews" ? (
              <ReviewsPanel />
            ) : (
              <div className="rounded-xl border border-dashed border-[#d8d8d5] p-8 text-sm text-[#777b78]">
                {activeTab} for {provider.name} will appear here.
              </div>
            )}
          </div>

          <ScheduleCard schedule={schedule} businessSlug={provider.slug} />
        </div>
      </div>
    </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[#d8d8d5] px-4 py-3 last:border-b-0 sm:border-r sm:last:border-r-0 lg:border-b-0">
      <p className="text-xs font-bold uppercase text-[#a7a9a7]">{label}</p>
      <p className="mt-2 text-xs font-bold text-[#161716]">{value}</p>
    </div>
  );
}

function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-12">
      <h2 className="mb-6 text-lg font-bold text-[#3c6355] sm:text-xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ReviewsPanel() {
  return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-[#777b78]">No reviews yet. Verified customer reviews will appear here when available.</div>;
}

function getServiceCategories(provider: TenantProfileData): ServiceCategory[] {
  if (!provider.servicesOffered) return [];

  const grouped = new Map<string, ServiceItem[]>();
  provider.servicesOffered.forEach((service) => {
    const items = grouped.get(service.category) ?? [];
    items.push(service);
    grouped.set(service.category, items);
  });

  return Array.from(grouped, ([label, services]) => ({ label, services }));
}

function ServicesPanel({ categories }: { categories: ServiceCategory[] }) {
  const [selectedCategory, setSelectedCategory] = useState(
    categories[0]?.label ?? "",
  );
  const category =
    categories.find(({ label }) => label === selectedCategory) ??
    categories[0];

  if (!categories.length) {
    return (
      <div className="rounded-xl border border-dashed border-[#d8d8d5] p-8 text-sm text-[#777b78]">
        No services are currently listed for this business.
      </div>
    );
  }

  const showSelector = categories.length > 1;

  return (
    <div className="space-y-6">
      {showSelector && (
        <div className="max-w-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#777b78]">
            Service type
          </p>
          <Select
            value={selectedCategory}
            onValueChange={(value) => {
              if (value !== null) setSelectedCategory(value);
            }}
          >
            <SelectTrigger
              aria-label="Choose a service type"
              className="h-11 rounded-xl border-[#d8d8d5] bg-white text-sm font-semibold text-[#3c6355] shadow-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(({ label }) => (
                <SelectItem key={label} value={label}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="rounded-xl border border-[#e5e6e4] bg-white px-4 sm:px-6">
        <div className="border-b border-[#e5e6e4] py-4">
          <h3 className="text-base font-bold text-[#3c6355]">
            {category.label}
          </h3>
          <p className="mt-1 text-xs text-[#929492]">
            Available services and starting prices
          </p>
        </div>
        <div className="divide-y divide-[#e5e6e4]">
          {category.services.map((service) => (
            <ServiceItemRow key={service.id ?? service.title} {...service} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ServiceItemRow({ title, description, price }: ServiceItem) {
  return (
    <article className="flex items-start justify-between gap-6 py-5">
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-[#272927] sm:text-base">
          {title}
        </h3>
        <p className="mt-1 text-xs text-[#929492] sm:text-sm">{description}</p>
      </div>
      <p className="shrink-0 pt-0.5 text-sm font-bold text-[#3c6355] sm:text-base">
        {price}
      </p>
    </article>
  );
}

function PhotoGallery({ providerName, photos }: { providerName: string; photos: string[] }) {
  if (!photos.length) return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-[#777b78]">This business has not added any photos yet.</p>;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((src, index) => (
        <div
          key={`${src}-${index}`}
          className="relative aspect-square overflow-hidden rounded-2xl bg-[#f0f0ef]"
        >
          <Image
            src={src}
            unoptimized
            alt={`${providerName} photo ${index + 1}`}
            fill
            sizes="(min-width: 640px) 220px, 50vw"
            className={`object-cover transition-transform duration-300 hover:scale-105`}
          />
        </div>
      ))}
    </div>
  );
}

function BusinessHoursList({ schedule }: { schedule: BusinessHoursDay[] }) {
  if (!schedule.length) return <p className="text-sm text-[#777b78]">Business hours have not been provided.</p>;
  return (
    <div className="max-w-[420px] space-y-3 text-xs font-semibold text-[#3c6355]">
      {getBusinessHoursDisplayRows(schedule).map((row) => (
        <div
          key={row.label}
          className="flex justify-between gap-4 border-b border-[#bfc3c0] pb-2"
        >
          <span>{row.label}</span>
          <span className="text-right">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function ScheduleCard({
  schedule,
  businessSlug,
}: {
  schedule: BusinessHoursDay[];
  businessSlug?: string;
}) {
  const businessStatus = schedule.length ? getBusinessHoursStatus(schedule) : { open: false, label: "Hours unavailable" };

  return (
    <Card className="h-fit rounded-xl border-[#d8d8d5] bg-white p-5 shadow-none">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#3c6355]">This week</h2>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-bold ${businessStatus.open ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}
        >
          {businessStatus.label}
        </span>
      </div>
      <div className="mt-5">
        <BusinessHoursList schedule={schedule} />
      </div>
      <AppointmentAuthGate businessSlug={businessSlug} />
      <p className="mt-5 text-center text-[8px] text-[#a7a9a7]">
        Free to request · no payment required now
      </p>
    </Card>
  );
}
