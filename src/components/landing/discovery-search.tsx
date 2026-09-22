import { Search } from "lucide-react";

export function DiscoverySearch() {
  return (
    <section id="browse" className="relative flex min-h-[560px] items-center justify-center px-6 sm:min-h-[620px] lg:min-h-[700px]">
      <button type="button" aria-label="Search for pet services" className="group flex size-12 items-center justify-center rounded-full border border-[#c8ced0] bg-white text-[#9aa1a3] shadow-[0_4px_18px_rgba(17,17,17,0.06)] transition-all hover:border-[#c5714e] hover:text-[#c5714e] hover:shadow-[0_8px_24px_rgba(197,113,78,0.16)]">
        <Search size={21} strokeWidth={1.4} className="transition-transform group-hover:scale-105" />
      </button>
    </section>
  );
}

