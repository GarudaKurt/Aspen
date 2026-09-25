import { z } from "zod";

export const businessAmenitySchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  custom: z.boolean().optional(),
});

export const businessHoursDaySchema = z.object({
  day: z.string().trim().min(1),
  open: z.boolean(),
  openTime: z.string().trim().min(1),
  closeTime: z.string().trim().min(1),
});

export const tenantProfileSchema = z.object({
  name: z.string().trim().min(1),
  rating: z.string(),
  reviews: z.string(),
  favorites: z.number().nonnegative().optional(),
  category: z.string(),
  address: z.string().trim().min(1),
  description: z.string().trim().min(1),
  serviceCoverage: z.array(z.string()),
  coverPhoto: z.string().nullable(),
  weeklyAvailabilitySet: z.boolean(),
  businessHours: z.array(businessHoursDaySchema),
  amenities: z.array(businessAmenitySchema),
  verified: z.boolean().optional(),
  slug: z.string().optional(),
});

export type PersistedTenantProfile = z.infer<typeof tenantProfileSchema>;
