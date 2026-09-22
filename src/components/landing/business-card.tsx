import { ArrowUpRight, Star } from "lucide-react";

export function BusinessCard() {
  return (
    <article className="min-w-0 overflow-hidden rounded-xl border border-[#e0e0dd] bg-white shadow-[0_2px_5px_rgba(20,20,20,0.15)] transition-transform hover:-translate-y-1">
      <div className="relative aspect-[1.36] overflow-hidden bg-[#d5e9e6]">
        <img src="/kalinga-waterfront.png" alt="Kalinga Animal Hospital waterfront view" className="block h-full w-full object-cover" />
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1"><span className="size-1.5 rounded-full bg-white" /><span className="size-1.5 rounded-full bg-white/60" /><span className="size-1.5 rounded-full bg-white/60" /></div>
      </div>
      <div className="space-y-1.5 p-3">
        <p className="text-[10px] text-[#8d918f]">Lapu-Lapu City, Philippines</p>
        <h3 className="truncate text-sm font-medium text-[#242524]">Kalinga Animal Hospital</h3>
        <div className="flex items-center gap-1 text-xs text-[#9a9c9b]"><Star size={13} fill="#ffd000" strokeWidth={0} /><span>4.8 (23)</span><span className="text-[#d9d9d7]">•</span><span>Vet Clinics</span><ArrowUpRight className="ml-auto text-[#ff8b2c]" size={18} /></div>
        <p className="text-xs text-[#8d918f]">Starts at <span className="font-semibold text-[#242524]">Php 1,500</span></p>
      </div>
    </article>
  );
}

