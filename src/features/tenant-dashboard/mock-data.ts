import type { ServiceAnalytics, ServiceItem } from "./types";

export const services: ServiceItem[] = [
  {
    id: "s1",
    title: "Full Grooming Package",
    category: "Grooming",
    description:
      "A complete grooming session for dogs and cats, including bath, trim, and finishing.",
    price: "₱900",
    duration: "90 min",
    photos: [],
    status: "Active",
  },
  {
    id: "s2",
    title: "Basic Bath & Trim",
    category: "Grooming",
    description:
      "A gentle bath and tidy trim to keep pets clean and comfortable.",
    price: "₱450",
    duration: "60 min",
    photos: [],
    status: "Active",
  },
  {
    id: "s3",
    title: "General Consultation",
    category: "Veterinary",
    description:
      "A friendly wellness consultation with practical care guidance.",
    price: "₱500",
    duration: "30 min",
    photos: [],
    status: "Draft",
  },
  {
    id: "s4",
    title: "Overnight Boarding",
    category: "Boarding",
    description:
      "A safe, supervised overnight stay with daily updates for pet parents.",
    price: "₱900",
    duration: "24 hr",
    photos: [],
    status: "Paused",
  },
];


export const serviceAnalytics: Record<string, ServiceAnalytics> = {
  s1: { views: 184, favorites: 42, inquiries: 18, bookings: 12 },
  s2: { views: 96, favorites: 21, inquiries: 9, bookings: 7 },
  s3: { views: 34, favorites: 5, inquiries: 2, bookings: 0 },
  s4: { views: 17, favorites: 3, inquiries: 1, bookings: 0 },
};
