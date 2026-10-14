"use client";

import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BusinessMap } from "@/components/landing/business-map";
import { formatBusinessAddress, type BusinessLocationDetails } from "../location";

type BusinessLocationPickerProps = {
  location: BusinessLocationDetails;
  onChange: (update: Partial<BusinessLocationDetails>) => void;
};

export function BusinessLocationPicker({ location, onChange }: BusinessLocationPickerProps) {
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

  return (
    <div className="rounded-xl border border-[#dfe8e2] bg-[#f7faf8] p-3">
      <div className="flex items-start gap-2 text-sm text-[#587267]">
        <MapPin className="mt-0.5 size-4 shrink-0 text-[#3c6355]" />
        <p>Drag the pin or click the map to select the exact storefront location. No address is sent to an external geocoding service.</p>
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
    </div>
  );
}
