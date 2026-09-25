import {
  Accessibility,
  Check,
  Armchair,
  Car,
  PawPrint,
  Snowflake,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import type { BusinessAmenity } from "../amenities";

const amenityIcons: Record<string, LucideIcon> = {
  parking: Car,
  wifi: Wifi,
  "air-conditioning": Snowflake,
  "waiting-area": Armchair,
  "pet-friendly-area": PawPrint,
  accessibility: Accessibility,
};

export function AmenityIcon({ amenity, size = 14 }: { amenity: BusinessAmenity; size?: number }) {
  const Icon = amenity.custom ? Check : amenityIcons[amenity.id] ?? PawPrint;
  return <Icon size={size} aria-hidden="true" />;
}
