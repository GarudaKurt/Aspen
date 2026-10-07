"use client";

import { useState } from "react";

import { DiscoverySearch } from "./discovery-search";
import { BusinessDirectory } from "./business-directory";
import { FeaturedStores } from "./featured-stores";
import { OwnerCta } from "./owner-cta";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

export function LandingPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [city, setCity] = useState("Cebu City");

  return (
    <main id="top" className="min-h-screen bg-white text-[#111111]">
      <SiteHeader />
      <div className="px-6 pt-8 sm:px-10 sm:pt-10 lg:px-[130px] 2xl:px-16">
        <div className="mx-auto max-w-[1440px] 2xl:max-w-[1680px]">
          <p className="text-sm font-semibold text-[#c5714e] sm:text-base">
          Now lived in Cebu, Manila and other cities.
          </p>
        </div>
      </div>
      <DiscoverySearch
        query={query}
        city={city}
        onQueryChange={setQuery}
        onCityChange={setCity}
        onSearch={setSubmittedQuery}
      />
      <FeaturedStores />
      <BusinessDirectory query={submittedQuery} city={city} />
      <OwnerCta />
      <SiteFooter />
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
