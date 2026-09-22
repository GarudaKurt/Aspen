import { ChevronDown, SlidersHorizontal } from "lucide-react";

const filters = ["All services", "Location", "Availability"];

export function TenantDirectory() {
  return (
    <section id="featured" className="border-t border-[#d8d8d8]">
      <div className="mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-[130px]">
        <div className="flex min-h-[148px] items-center border-b border-[#d8d8d8]">
          <h2 className="max-w-[620px] text-2xl font-extralight leading-tight tracking-[-0.02em] text-[#141414] sm:text-[32px]">Top-rated tenants, handpicked this week.</h2>
        </div>
        <div className="flex flex-col gap-5 border-b border-[#d8d8d8] py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-[#6b7172]"><SlidersHorizontal size={16} strokeWidth={1.4} /><span>Filter by services</span></div>
          <span className="text-sm text-[#6b7172]">10 businesses</span>
        </div>
        <div className="flex flex-wrap gap-3 py-8">
          {filters.map((filter) => (
            <button type="button" key={filter} className="inline-flex items-center gap-3 rounded-full border border-[#d8d8d8] px-4 py-2 text-sm text-[#3c6355] transition-colors hover:border-[#3c6355] hover:bg-[#f5f7f5]">{filter}<ChevronDown size={15} strokeWidth={1.5} /></button>
          ))}
        </div>
      </div>
    </section>
  );
}

