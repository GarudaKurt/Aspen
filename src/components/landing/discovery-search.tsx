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
import { philippineLocations } from "./philippine-locations";

type DiscoverySearchProps = {
  query: string;
  city: string;
  onQueryChange: (query: string) => void;
  onCityChange: (city: string, coordinates?: [number, number]) => void;
  onSearch: (query: string) => void;
  serviceCategory: string;
  onServiceCategoryChange: (category: string) => void;
};

const serviceCategories = [
  { label: "All Services", icon: ListFilter },
  { label: "Vet Clinics", icon: Stethoscope },
  { label: "Pet Supplies", icon: ShoppingBag },
  { label: "Grooming", icon: Scissors },
  { label: "Boarding", icon: Hotel },
  { label: "Training", icon: GraduationCap },
];

export function CityCombobox({
  city,
  onCityChange,
  variant = "embedded",
}: {
  city: string;
  onCityChange: (city: string, coordinates?: [number, number]) => void;
  variant?: "embedded" | "field";
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(city === "All Cities" ? "" : city);
  const [customResults, setCustomResults] = useState<CitySearchResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState("");
  const cities = [
    "All Cities",
    ...philippineLocations.map(({ name }) => name),
  ];
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
  const normalizedSearch = search.trim().toLowerCase();
  const hasExactPredefinedCity = cities.some(
    (option) => option.toLowerCase() === normalizedSearch,
  );

  const validateCustomCity = async () => {
    const query = search.trim();
    if (!query || hasExactPredefinedCity) return;

    setIsValidating(true);
    setValidationError("");
    setCustomResults([]);

    try {
      const response = await fetch(
        `/api/geocode/city?q=${encodeURIComponent(query)}`,
      );

      if (!response.ok) throw new Error("Location service unavailable");

      const results = (await response.json()) as NominatimResult[];
      const validResults = results
        .map(toCitySearchResult)
        .filter((result): result is CitySearchResult => Boolean(result));

      if (!validResults.length) {
        setValidationError("We could not verify that city. Try a nearby municipality or check the spelling.");
      } else {
        setCustomResults(validResults);
      }
    } catch {
      setValidationError("We could not verify this city right now. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  const selectCity = (value: string, coordinates?: [number, number]) => {
    onCityChange(value, coordinates);
    setSearch(value === "All Cities" ? "" : value);
    setCustomResults([]);
    setValidationError("");
    setOpen(false);
  };

  const predefinedCoordinates = (value: string) =>
    philippineLocations.find(
      ({ name }) => name.toLowerCase() === value.toLowerCase(),
    )?.coordinates;

  return (
    <div
      ref={containerRef}
      className={`relative z-30 min-w-0 flex-1 ${variant === "field" ? "rounded-lg border border-[#d2d5d2] bg-white px-3 focus-within:border-[#3c6355] focus-within:ring-2 focus-within:ring-[#3c6355]/20" : ""}`}
    >
      <div className="flex items-center gap-1">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setCustomResults([]);
            setValidationError("");
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setSearch(city === "All Cities" ? "" : city);
              setOpen(false);
            }

            if (event.key === "Enter" && filteredCities.length === 1) {
              event.preventDefault();
              selectCity(filteredCities[0]);
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
                onClick={() => selectCity(option, predefinedCoordinates(option))}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[#f3f3f2] focus-visible:bg-[#f3f3f2] focus-visible:outline-none"
              >
                <Check
                  size={16}
                  className={isSelected ? "text-[#3c6355]" : "text-transparent"}
                />
                <span>{option}</span>
              </button>
            );
          })}

          {search.trim() && !hasExactPredefinedCity && (
            <button
              type="button"
              onClick={validateCustomCity}
              disabled={isValidating}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#3c6355] hover:bg-[#f3f3f2] focus-visible:bg-[#f3f3f2] focus-visible:outline-none disabled:cursor-wait disabled:opacity-60"
            >
              <Search size={16} />
              {isValidating ? "Checking location…" : `Search for “${search.trim()}”`}
            </button>
          )}

          {customResults.map((result) => (
            <button
              key={`${result.coordinates.join(",")}-${result.name}`}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => selectCity(result.name, result.coordinates)}
              className="flex w-full flex-col items-start rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[#f3f3f2] focus-visible:bg-[#f3f3f2] focus-visible:outline-none"
            >
              <span className="font-medium text-[#242524]">{result.name}</span>
              <span className="mt-0.5 text-xs text-[#737773]">{result.displayName}</span>
            </button>
          ))}

          {!filteredCities.length && (
            <p className="px-3 py-2.5 text-sm text-[#737773]">
              {customResults.length ? "Choose a verified location above." : "No predefined city matches yet."}
            </p>
          )}

          {validationError && (
            <p role="alert" className="px-3 py-2.5 text-sm text-red-600">
              {validationError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

type NominatimResult = {
  display_name?: string;
  lat?: string;
  lon?: string;
  name?: string;
  addresstype?: string;
  address?: {
    city?: string;
    municipality?: string;
    town?: string;
    village?: string;
  };
};

type CitySearchResult = {
  name: string;
  displayName: string;
  coordinates: [number, number];
};

function toCitySearchResult(result: NominatimResult): CitySearchResult | null {
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  const name =
    result.address?.city ??
    result.address?.municipality ??
    result.address?.town ??
    result.address?.village ??
    result.name;

  const acceptedPlaceTypes = new Set(["city", "town", "municipality"]);

  if (
    !name ||
    !acceptedPlaceTypes.has(result.addresstype ?? "") ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return {
    name,
    displayName: result.display_name ?? name,
    coordinates: [longitude, latitude],
  };
}

export function DiscoverySearch({
  query,
  city,
  onQueryChange,
  onCityChange,
  onSearch,
  serviceCategory,
  onServiceCategoryChange,
}: DiscoverySearchProps) {

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(query.trim());
  };

  return (
    <section
      id="browse"
      className="scroll-mt-24 px-6 pb-12 pt-3 sm:scroll-mt-28 sm:px-10 sm:pb-16 sm:pt-4 lg:px-[130px] 2xl:px-16 2xl:max-w-[1680px] min-[1600px]:!max-w-none min-[1600px]:!px-0"
    >
      <div className="mx-auto max-w-[1440px] 2xl:max-w-[1680px] min-[1600px]:px-14">
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
          className="relative z-20 mt-7 flex w-full max-w-[680px] 2xl:max-w-[720px] flex-col overflow-visible rounded-2xl border border-[#c8c8c5] bg-white sm:h-[62px] sm:flex-row sm:items-center"
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
          <div className="flex min-h-[52px] shrink-0 items-center gap-2 border-t border-[#e6e5e1] px-5 text-[#444743] sm:w-[230px] min-[1600px]:w-[200px] sm:border-t-0">
            <MapPin size={18} strokeWidth={1.4} className="shrink-0" />
            <CityCombobox key={city} city={city} onCityChange={onCityChange} />
          </div>
          <Button
            variant="ghost"
            type="submit"
            aria-label="Search"
            className="flex h-auto min-h-[52px] w-full items-center justify-start gap-3 overflow-hidden rounded-b-2xl border-t border-[#e6e5e1] bg-transparent px-5 text-base font-semibold text-[#2c2c2c] transition-colors hover:bg-[#f3f3f2] hover:text-[#3c6355] sm:mx-2 sm:my-2 sm:h-11 sm:min-h-[44px] sm:w-auto sm:shrink-0 sm:justify-center sm:gap-2 sm:rounded-xl sm:border-0 sm:px-4"
          >
            <ArrowUpRight size={20} strokeWidth={1.8} className="shrink-0" />
            Search
          </Button>
        </form>
        <div className="mt-6 flex max-w-full gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:w-fit lg:grid-cols-[repeat(3,max-content)] lg:justify-items-start lg:gap-x-15 lg:gap-y-2 lg:overflow-visible">
          {serviceCategories.map(({ label, icon: Icon }) => {
            const isActive = serviceCategory === label;

            return (
              <Button
                variant="ghost"
                type="button"
                key={label}
                onClick={() => onServiceCategoryChange(label)}
                aria-pressed={isActive}
                className={`inline-flex h-auto shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-transparent bg-transparent px-4 py-2 text-base font-semibold text-[#2c2c2c] hover:bg-transparent hover:!text-[#3c6355] sm:text-lg ${isActive ? "border-[#3c6355] !text-[#3c6355]" : ""}`}
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
