import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BusinessCard } from "./business-card";
import { mockBusinesses } from "./mock-businesses";

export function FeaturedStores() {
  return (
    <section id="featured" className="border-b border-[#d6d9d6] py-12 sm:py-16">
      <div className="mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-[130px]">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold tracking-[-0.03em] text-[#3c6355] sm:text-4xl">
              Featured stores near you
            </h2>
            <p className="mt-2 text-sm text-[#777b78] sm:text-base">
              Top-rated tenants, handpicked this week.
            </p>
          </div>
          <div className="hidden gap-2 sm:flex">
            <Button
              variant="ghost"
              type="button"
              aria-label="Previous featured stores"
              className="flex size-9 items-center justify-center rounded-full border border-[#e2e6e4] text-[#b9c1bd]"
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="ghost"
              type="button"
              aria-label="Next featured stores"
              className="flex size-9 items-center justify-center rounded-full border border-[#e2e6e4] text-[#b9c1bd]"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-5 min-[560px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {mockBusinesses.slice(0, 4).map((business, index) => (
            <BusinessCard
              key={`${business.businessName}-${index}`}
              {...business}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
