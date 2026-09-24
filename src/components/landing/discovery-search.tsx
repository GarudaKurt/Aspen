"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  Hotel,
  ListFilter,
  MapPin,
  Scissors,
  Search,
  ShoppingBag,
  Stethoscope,
} from "lucide-react";
import { useState, type FormEvent } from "react";

type DiscoverySearchProps = {
  query: string;
  city: string;
  onQueryChange: (query: string) => void;
  onCityChange: (city: string) => void;
  onSearch: (query: string) => void;
};

const cities = [
  "Cebu City",
  "Mandaue City",
  "Lapu-Lapu City",
  "Talisay City",
  "Naga City",
  "Carcar City",
  "Danao City",
];

const serviceCategories = [
  { label: "All Services", icon: ListFilter },
  { label: "Vet Clinics", icon: Stethoscope },
  { label: "Pet Supplies", icon: ShoppingBag },
  { label: "Grooming", icon: Scissors },
  { label: "Boarding", icon: Hotel },
  { label: "Training", icon: GraduationCap },
];

export function DiscoverySearch({
  query,
  city,
  onQueryChange,
  onCityChange,
  onSearch,
}: DiscoverySearchProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(query.trim());
  };

  return (
    <section
      id="browse"
      className="px-6 pb-12 pt-8 sm:px-10 sm:pb-16 sm:pt-10 lg:px-[130px]"
    >
      <div className="mx-auto max-w-[1440px]">
        <h1 className="max-w-[780px] text-4xl font-bold leading-[1.12] tracking-[-0.04em] text-[#3c6355] sm:text-5xl lg:text-[58px]">
          Trusted pet care, found in minutes
        </h1>
        <p className="mt-4 max-w-[640px] text-lg leading-6 text-[#242524] sm:text-xl">
          Vet clinics, groomers, boarding and supply shops near you
          <br className="hidden sm:block" /> browse real profiles and book
          straight from the listing.
        </p>
        <form
          onSubmit={submitSearch}
          className="mt-7 flex h-[62px] max-w-[660px] min-w-0 flex-row items-center overflow-hidden rounded-2xl border border-[#c8c8c5] bg-white"
        >
          <div className="flex min-h-0 min-w-0 flex-1 items-center gap-2 px-3 text-[#8e918e] sm:gap-3 sm:px-5">
            <Search size={20} strokeWidth={1.3} className="shrink-0" />
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              aria-label="Search clinics, shops, groomers"
              placeholder="Search clinics, shops, groomers"
              className="min-w-0 flex-1 border-0 bg-transparent px-0 text-base text-[#242524] shadow-none outline-none placeholder:text-[#8e918e] focus-visible:ring-0 sm:text-lg"
            />
          </div>
          <div className="mx-1 h-9 w-px shrink-0 bg-[#e6e5e1] sm:mx-4" />
          <div className="flex min-h-0 shrink-0 items-center gap-1 border-l border-[#e6e5e1] px-2 text-[#444743] sm:gap-2 sm:px-5">
            <MapPin size={18} strokeWidth={1.4} className="shrink-0" />
            <Select
              value={city}
              onValueChange={(value) => {
                if (value) onCityChange(value);
              }}
            >
              <SelectTrigger
                aria-label="Choose city"
                className="h-auto w-auto border-0 bg-transparent px-0 py-0 text-base shadow-none focus-visible:ring-0"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cities.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            type="submit"
            aria-label="Search"
            className="mx-1 flex h-11 min-h-0 w-auto shrink-0 items-center justify-center gap-2 rounded-xl bg-transparent px-3 text-base font-semibold text-[#2c2c2c] transition-colors hover:bg-[#f3f3f2] hover:text-[#3c6355] sm:mx-2 sm:px-4"
          >
            <Search size={20} strokeWidth={1.8} className="shrink-0" />
            <span className="hidden sm:inline">Search</span>
          </Button>
        </form>
        <div className="mt-6 flex max-w-[760px] gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {serviceCategories.map(({ label, icon: Icon }) => {
            const isActive = selectedCategory === label;

            return (
              <Button
                variant="ghost"
                type="button"
                key={label}
                onClick={() => setSelectedCategory(label)}
                aria-pressed={isActive}
                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-transparent bg-transparent px-5 py-2.5 text-base font-semibold text-[#2c2c2c] hover:bg-transparent hover:!text-[#3c6355] sm:text-lg ${isActive ? "border-[#3c6355] !text-[#3c6355]" : ""}`}
              >
                <Icon size={22} strokeWidth={1.8} className="shrink-0" />
                {label}
              </Button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
