"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  GraduationCap,
  Hotel,
  ListFilter,
  MapPin,
  Scissors,
  Search,
  ShoppingBag,
  Stethoscope,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

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

function CityCombobox({
  city,
  onCityChange,
}: {
  city: string;
  onCityChange: (city: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(city);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const filteredCities = cities.filter((option) =>
    option.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const customCity = search.trim();
  const hasExactCity = cities.some(
    (option) => option.toLowerCase() === customCity.toLowerCase(),
  );

  const selectCity = (value: string) => {
    onCityChange(value);
    setSearch(value);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative z-30 min-w-0 flex-1">
      <div className="flex items-center gap-1">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setSearch(city);
              setOpen(false);
            }

            if (event.key === "Enter" && customCity) {
              event.preventDefault();
              selectCity(customCity);
            }
          }}
          role="combobox"
          aria-expanded={open}
          aria-controls="city-options"
          aria-label="Search or choose city"
          placeholder="Choose city"
          className="h-10 min-w-0 flex-1 border-0 bg-transparent px-0 text-base text-[#444743] shadow-none !transition-none focus-visible:ring-0"
        />
        <Button
          type="button"
          variant="ghost"
          aria-label={open ? "Close city selector" : "Open city selector"}
          onClick={() => setOpen((currentOpen) => !currentOpen)}
          className="size-8 shrink-0 rounded-full p-0 text-[#444743] hover:bg-[#f3f3f2] hover:text-[#3c6355]"
        >
          <ChevronDown
            size={17}
            strokeWidth={1.8}
            className={open ? "rotate-180 transition-none" : "transition-none"}
          />
        </Button>
      </div>

      {open && (
        <div
          id="city-options"
          role="listbox"
          className="absolute left-0 top-[calc(100%+0.5rem)] z-50 max-h-72 w-[min(18rem,calc(100vw-3rem))] overflow-y-auto rounded-xl border border-[#d8d8d8] bg-white p-1.5 text-[#242524] shadow-lg"
        >
          {filteredCities.map((option) => {
            const isSelected = city === option;

            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => selectCity(option)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[#f3f3f2] focus-visible:bg-[#f3f3f2] focus-visible:outline-none"
              >
                <Check
                  size={16}
                  className={isSelected ? "text-[#3c6355]" : "text-transparent"}
                />
                {option}
              </button>
            );
          })}

          {customCity && !hasExactCity && (
            <button
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => selectCity(customCity)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-[#3c6355] hover:bg-[#eef5f1] focus-visible:bg-[#eef5f1] focus-visible:outline-none"
            >
              <MapPin size={16} />
              <span>
                Use <span className="font-semibold">{customCity}</span>
              </span>
            </button>
          )}

          {!filteredCities.length && !customCity && (
            <p className="px-3 py-2.5 text-sm text-[#737773]">
              Type a city to search or enter a custom city.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

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
      className="px-6 pb-12 pt-3 sm:px-10 sm:pb-16 sm:pt-4 lg:px-[130px] 2xl:px-16 2xl:max-w-[1680px]"
    >
      <div className="mx-auto max-w-[1440px] 2xl:max-w-[1680px]">
        <h1 className="max-w-[1000px] text-4xl font-bold leading-[1.12] tracking-[-0.04em] text-[#3c6355] sm:text-5xl lg:text-[58px]">
          Trusted pet care, found in <br className="hidden sm:block" /> minutes
        </h1>
        <p className="mt-4 max-w-[820px] text-lg leading-6 text-[#242524] sm:text-xl">
          Vet clinics, groomers, boarding and supply shops near you
          <br className="hidden sm:block" /> browse real profiles and book
          straight from the listing.
        </p>
        <form
          onSubmit={submitSearch}
          className="relative z-20 mt-7 flex w-full max-w-[680px] 2xl:max-w-[1040px] flex-col overflow-visible rounded-2xl border border-[#c8c8c5] bg-white sm:h-[62px] sm:flex-row sm:items-center"
        >
          <div className="flex min-h-[64px] min-w-0 flex-[2_1_0%] items-center gap-3 px-5 text-[#8e918e]">
            <Search size={20} strokeWidth={1.3} className="shrink-0" />
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              aria-label="Search clinics, shops, groomers"
              placeholder="Search clinics, shops, groomers"
              className="w-full min-w-0 flex-1 border-0 bg-transparent px-0 text-base text-[#242524] shadow-none outline-none placeholder:text-[#8e918e] focus-visible:ring-0 sm:text-lg"
            />
          </div>
          <div className="mx-4 hidden h-9 w-px bg-[#e6e5e1] sm:block" />
          <div className="flex min-h-[52px] shrink-0 items-center gap-2 border-t border-[#e6e5e1] px-5 text-[#444743] sm:w-[230px] sm:border-t-0">
            <MapPin size={18} strokeWidth={1.4} className="shrink-0" />
            <CityCombobox key={city} city={city} onCityChange={onCityChange} />
          </div>
          <Button
            variant="ghost"
            type="submit"
            aria-label="Search"
            className="flex h-auto min-h-[52px] w-full items-center justify-start gap-3 rounded-none border-t border-[#e6e5e1] bg-transparent px-5 text-base font-semibold text-[#2c2c2c] transition-colors hover:bg-[#f3f3f2] hover:text-[#3c6355] sm:mx-2 sm:my-2 sm:h-11 sm:min-h-[44px] sm:w-auto sm:shrink-0 sm:justify-center sm:gap-2 sm:rounded-xl sm:border-0 sm:px-4"
          >
            <ArrowUpRight size={20} strokeWidth={1.8} className="shrink-0" />
            Search
          </Button>
        </form>
        <div className="mt-6 grid w-fit max-w-full grid-cols-[repeat(3,max-content)] justify-items-start gap-x-15 gap-y-2">
          {serviceCategories.map(({ label, icon: Icon }) => {
            const isActive = selectedCategory === label;

            return (
              <Button
                variant="ghost"
                type="button"
                key={label}
                onClick={() => setSelectedCategory(label)}
                aria-pressed={isActive}
                className={`inline-flex h-auto items-center gap-2 whitespace-nowrap rounded-full border border-transparent bg-transparent px-4 py-2 text-base font-semibold text-[#2c2c2c] hover:bg-transparent hover:!text-[#3c6355] sm:text-lg ${isActive ? "border-[#3c6355] !text-[#3c6355]" : ""}`}
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
