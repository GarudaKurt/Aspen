import { ChevronDown, MapPin, Search } from "lucide-react";

export function DiscoverySearch() {
  return (
    <section id="browse" className="px-6 pb-12 pt-8 sm:px-10 sm:pb-16 sm:pt-10 lg:px-[130px]">
      <div className="mx-auto max-w-[1440px]">
        <h1 className="max-w-[780px] text-4xl font-bold leading-[1.12] tracking-[-0.04em] text-[#3c6355] sm:text-5xl lg:text-[58px]">Trusted pet care, found in minutes</h1>
        <p className="mt-4 max-w-[640px] text-lg leading-6 text-[#242524] sm:text-xl">Vet clinics, groomers, boarding and supply shops near you<br className="hidden sm:block" /> browse real profiles and book straight from the listing.</p>
        <form className="mt-7 flex max-w-[660px] flex-col overflow-hidden rounded-2xl border border-[#c8c8c5] bg-white sm:h-[62px] sm:flex-row sm:items-center">
          <label className="flex min-h-[58px] flex-1 items-center gap-3 px-5 text-[#8e918e]"><Search size={20} strokeWidth={1.3} /><span className="text-base sm:text-lg">Search clinics, shops, groomers</span></label>
          <div className="mx-4 hidden h-9 w-px bg-[#e6e5e1] sm:block" />
          <button type="button" className="flex min-h-[52px] items-center gap-2 border-t border-[#e6e5e1] px-5 text-[#444743] sm:border-t-0"><MapPin size={18} strokeWidth={1.4} /><span className="text-base">Cebu City</span><ChevronDown size={16} /></button>
          <button type="submit" className="mx-2 mb-2 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#3c6355] px-5 text-base font-semibold text-white transition-colors hover:bg-[#2f5044] sm:my-2 sm:mb-0">→ <span>Search</span></button>
        </form>
        <div className="mt-6 flex max-w-[760px] flex-wrap gap-2.5">{["All Services", "Vet Clinics", "Pet Supplies", "Grooming", "Boarding", "Training"].map((category, index) => <button type="button" key={category} className={`rounded-full px-4 py-2 text-xs font-semibold ${index === 0 ? "bg-[#3c6355] text-white" : "bg-[#f3f3f2] text-[#353735] hover:bg-[#e9ece9]"}`}>{category}</button>)}</div>
      </div>
    </section>
  );
}

