import { BusinessCard } from "./business-card";
import type { BusinessCardProps } from "./business-card";

export function FeaturedStores({ businesses }: { businesses: BusinessCardProps[] }) {
  if (!businesses.length) return null;
  return (
    <section id="featured" className="border-b border-[#d6d9d6] py-12 sm:py-16">
      <div className="mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-[130px] 2xl:max-w-[1680px] 2xl:px-16">
        <div>
          <h2 className="text-3xl font-bold tracking-[-0.03em] text-[#3c6355] sm:text-4xl">
            Explore pet services
          </h2>
          <p className="mt-2 text-sm text-[#777b78] sm:text-base">
            Discover recently listed pet-service businesses.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-5 min-[560px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {businesses.slice(0, 4).map((business, index) => (
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
