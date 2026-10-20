"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DiscoverySearch } from "./discovery-search";
import { BusinessDirectory } from "./business-directory";
import { FeaturedStores } from "./featured-stores";
import { OwnerCta } from "./owner-cta";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { BusinessMap } from "./business-map";
import { mockBusinesses } from "./mock-businesses";
import { filterBusinesses } from "./business-filtering";

export function LandingPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [city, setCity] = useState("All Cities");
  const [selectedCityCoordinates, setSelectedCityCoordinates] = useState<
    [number, number] | undefined
  >();
  const [serviceCategory, setServiceCategory] = useState("All Services");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [searchRequested, setSearchRequested] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const filteredBusinesses = useMemo(
    () =>
      filterBusinesses(
        mockBusinesses,
        submittedQuery,
        city,
        selectedFilters,
      ),
    [city, selectedFilters, submittedQuery],
  );
  const mapBusinesses = filteredBusinesses;

  const updateServiceFilters = (filters: string[]) => {
    setSelectedFilters(filters);
    setServiceCategory(filters[0] ?? "All Services");
  };

  useEffect(() => {
    if (!searchRequested) return;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById("all-businesses")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
      setSearchRequested(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [searchRequested]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 480);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSearch = () => {
    document.getElementById("browse")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  };

  return (
    <main id="top" className="min-h-screen bg-white text-[#111111]">
      <SiteHeader />
      <div className="px-6 pt-8 sm:px-10 sm:pt-10 lg:px-[130px] 2xl:px-16 min-[1600px]:!px-0">
        <div className="mx-auto max-w-[1440px] 2xl:max-w-[1680px] min-[1600px]:px-14">
          <p className="text-sm font-semibold text-[#c5714e] sm:text-base">
            Now lived in Cebu, Manila and other cities.
          </p>
        </div>
      </div>
      <DiscoverySearch
        query={query}
        city={city}
        onQueryChange={setQuery}
        onCityChange={(value, coordinates) => {
          setCity(value);
          setSelectedCityCoordinates(coordinates);
        }}
        onSearch={(nextQuery) => {
          setSubmittedQuery(nextQuery);
          setSearchRequested(true);
        }}
        serviceCategory={serviceCategory}
        onServiceCategoryChange={(category) =>
          updateServiceFilters(category === "All Services" ? [] : [category])
        }
      />
      <FeaturedStores />
      <BusinessDirectory
        query={submittedQuery}
        city={city}
        selectedFilters={selectedFilters}
        onSelectedFiltersChange={updateServiceFilters}
      />
      <BusinessMap
        businesses={mapBusinesses}
        selectedCity={city}
        selectedCityCoordinates={selectedCityCoordinates}
        allowCityFallback
      />
      <OwnerCta />
      <SiteFooter />
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToSearch}
          aria-label="Scroll back to search"
          className="fixed bottom-6 right-6 z-30 inline-flex size-12 items-center justify-center rounded-full border border-[#315447] bg-[#3c6355] text-white shadow-lg transition hover:bg-[#315447] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3c6355] focus-visible:ring-offset-2 sm:bottom-8 sm:right-8"
        >
          <ArrowUp size={20} aria-hidden="true" />
        </button>
      )}
      <section id="how-it-works" className="sr-only" aria-label="How it works">
        <span>Discover trusted pet services near you.</span>
      </section>
      <section
        id="legacy-list-your-business"
        className="sr-only"
        aria-label="List your business"
      >
        <span>List your pet-service business on Aspen.</span>
      </section>
    </main>
  );
}
