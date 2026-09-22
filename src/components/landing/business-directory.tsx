import { Check, SlidersHorizontal } from "lucide-react";
import { BusinessCard } from "./business-card";

const serviceFilters = ["Vet clinics", "Pet supplies", "Grooming", "Boarding", "Training"];

export function BusinessDirectory({ query, city }: { query: string; city: string }) {
  const hasResults = !query || "kalinga animal hospital vet clinics".includes(query.toLowerCase());
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-[130px]"><h2 className="text-3xl font-bold tracking-[-0.03em] text-[#3c6355] sm:text-4xl">All businesses</h2><p className="mt-2 text-sm text-[#777b78] sm:text-base">Filter by services</p><div className="mt-8 grid gap-10 lg:grid-cols-[202px_1fr]">
        <aside className="h-fit rounded-lg bg-[#faf9f6] p-5"><div className="flex items-center gap-2"><SlidersHorizontal size={17} className="text-[#3c6355]" /><h3 className="text-xl font-bold text-[#3c6355]">Filters</h3></div><p className="mt-5 text-sm font-semibold text-[#383a38]">Service type</p><div className="mt-4 space-y-2">{serviceFilters.map((filter, index) => <button type="button" key={filter} className={`flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold capitalize transition-colors ${index === 0 ? "border-[#3c6355] bg-[#3c6355] text-white" : "border-[#343634] bg-white text-[#202220] hover:bg-[#f2f5f3]"}`}>{index === 0 && <Check size={15} />}{filter}</button>)}<button type="button" className="mt-2 w-full rounded-full border border-[#343634] bg-white px-4 py-2 text-sm font-semibold text-[#202220]">Clear Filters</button></div></aside>
        <div><div className="mb-5 flex flex-wrap justify-between gap-2 text-sm text-[#818682]"><span>{hasResults ? "10 businesses" : "0 businesses"}</span><span>{city}</span></div>{hasResults ? <div className="grid grid-cols-1 gap-5 min-[560px]:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <BusinessCard key={index} />)}</div> : <div className="rounded-xl border border-dashed border-[#d8d8d8] p-10 text-center text-sm text-[#777b78]">No businesses matched “{query}”. Try another search.</div>}</div>
      </div></div>
    </section>
  );
}

