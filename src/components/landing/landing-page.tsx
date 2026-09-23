"use client";

import { useState } from "react";

import { DiscoverySearch } from "./discovery-search";
import { BusinessDirectory } from "./business-directory";
import { FeaturedStores } from "./featured-stores";
import { OwnerCta } from "./owner-cta";
import { ServiceBrowse } from "./service-browse";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

export function LandingPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [city, setCity] = useState("Cebu City");

  return (
    <main id="top" className="min-h-screen bg-white text-[#111111]">
      <SiteHeader />
      <div className="mx-auto max-w-[1440px] px-6 pt-10 sm:px-10 lg:px-[130px]">
        <p className="text-sm font-semibold text-[#c5714e] sm:text-base">
          Now lived in Cebu, Manila and other cities.
        </p>
      </div>
      <DiscoverySearch
        query={query}
        city={city}
        onQueryChange={setQuery}
        onCityChange={setCity}
        onSearch={setSubmittedQuery}
      />
      <FeaturedStores />
      <ServiceBrowse />
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
