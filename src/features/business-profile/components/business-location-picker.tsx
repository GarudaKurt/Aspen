"use client";

import { MapPin, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BusinessMap } from "@/components/landing/business-map";
import { formatBusinessAddress, type BusinessLocationDetails } from "../location";

type BusinessLocationPickerProps = {
  location: BusinessLocationDetails;
  onChange: (update: Partial<BusinessLocationDetails>) => void;
};

export function BusinessLocationPicker({ location, onChange }: BusinessLocationPickerProps) {
  const [status, setStatus] = useState<"idle" | "searching" | "found" | "not-found" | "error">("idle");
  const addressQuery = formatBusinessAddress(location, "");
  const mapBusiness = {
    businessName: "Selected business location",
    location: formatBusinessAddress(location, "Business location"),
    coordinates: location.coordinates ?? undefined,
    rating: "",
    services: "",
    priceStarts: "",
    slug: "location-picker",
    images: [],
  };

  const findAddress = async () => {
    if (!addressQuery) return;
    setStatus("searching");
    try {
      const params = new URLSearchParams({
        q: `${addressQuery}, Philippines`,
        format: "jsonv2",
        limit: "1",
        countrycodes: "ph",
      });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        { headers: { "Accept-Language": "en" } },
      );
      if (!response.ok) throw new Error("Geocoding request failed");
      const results = (await response.json()) as Array<{
        lat: string;
        lon: string;
      }>;
      const result = results[0];
      if (!result) {
        setStatus("not-found");
        return;
      }
      onChange({ coordinates: [Number(result.lon), Number(result.lat)] });
      setStatus("found");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="rounded-xl border border-[#dfe8e2] bg-[#f7faf8] p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2 text-sm text-[#587267]">
          <MapPin className="mt-0.5 size-4 shrink-0 text-[#3c6355]" />
          <p>Find the address, then drag the pin or click the map to fine-tune the storefront location.</p>
        </div>
        <Button type="button" variant="outline" onClick={findAddress} disabled={!addressQuery || status === "searching"} className="shrink-0 border-[#cfded5] text-[#3c6355] hover:bg-white">
          <Search className="mr-2 size-4" />
          {status === "searching" ? "Finding..." : "Find on map"}
        </Button>
      </div>
      <div className="mt-3">
        <BusinessMap
          businesses={[mapBusiness]}
          selectedCity="All Cities"
          compact
          mapHeight="profile"
          onMapClick={(coordinates) => onChange({ coordinates })}
          onCoordinatesChange={(coordinates) => onChange({ coordinates })}
        />
      </div>
      <p className="mt-2 text-xs text-[#69736d]">
        {location.coordinates
          ? `Selected coordinates: ${location.coordinates[1].toFixed(5)}, ${location.coordinates[0].toFixed(5)}`
          : "No exact pin selected yet."}
      </p>
      {status === "found" && <p className="mt-1 text-xs text-[#3c6355]">Address located. Please verify the pin before saving.</p>}
      {status === "not-found" && <p className="mt-1 text-xs text-amber-700">We could not locate this address. Move the pin manually to the correct storefront.</p>}
      {status === "error" && <p className="mt-1 text-xs text-red-600">The address search is unavailable. You can still place the pin manually.</p>}
    </div>
  );
}
