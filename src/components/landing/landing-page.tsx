import { DiscoverySearch } from "./discovery-search";
import { BusinessDirectory } from "./business-directory";
import { FeaturedStores } from "./featured-stores";
import { OwnerCta } from "./owner-cta";
import { ServiceBrowse } from "./service-browse";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

export function LandingPage() {
  return (
    <main id="top" className="min-h-screen bg-white text-[#111111]">
      <SiteHeader />
      <div className="mx-auto max-w-[1440px] px-6 pt-10 sm:px-10 lg:px-[130px]"><p className="text-sm font-semibold text-[#c5714e] sm:text-base">Now lived in Cebu, Manila and other cities.</p></div>
      <DiscoverySearch />
      <FeaturedStores />
      <ServiceBrowse />
      <BusinessDirectory />
      <OwnerCta />
      <SiteFooter />
      <section id="how-it-works" className="sr-only" aria-label="How it works">Discover trusted pet services near you.</section>
      <section id="legacy-list-your-business" className="sr-only" aria-label="List your business">List your pet-service business on Aspen.</section>
    </main>
  );
}

