import { z } from "zod";

const optionalText = z.string().trim().max(500).optional().or(z.literal(""));

export const businessLocationSchema = z.object({
  province: z.string().trim().max(120),
  cityMunicipality: z.string().trim().min(1).max(120),
  barangay: z.string().trim().max(120),
  streetAddress: z.string().trim().min(1).max(240),
  landmark: z.string().trim().max(240),
  additionalDetails: z.string().trim().max(500),
  coordinates: z
    .tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
    .nullable(),
});

export const businessHoursSchema = z.object({
  day: z.string().trim().min(1).max(20),
  open: z.boolean(),
  openTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
}).superRefine((value, context) => {
  if (!value.open) return;
  if (value.openTime >= value.closeTime) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["closeTime"], message: "Closing time must be later than opening time." });
  }
});

export const businessServiceSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(2000),
  price: z.string().trim().min(1).max(40),
  duration: z.string().trim().max(40),
  photos: z.array(z.string().max(500)).max(6).default([]),
  status: z.enum(["Active", "Draft", "Paused"]),
});

export const businessProfileSchema = z.object({
  providerType: z.string().trim().min(1).max(80),
  businessName: z.string().trim().min(2).max(160),
  businessDescription: z.string().trim().min(10).max(3000),
  yearsExperience: z.coerce.number().int().min(0).max(100).nullable(),
  facebookPage: optionalText,
  locationDetails: businessLocationSchema,
});

export const identityDetailsSchema = z.object({
  fullName: z.string().trim().max(160),
  idType: z.string().trim().min(1).max(80),
  contactNumber: z.string().trim().max(40),
  verificationStatus: z.enum(["idle", "verified", "invalid"]),
});

export const providerApplicationSchema = businessProfileSchema.extend({
  selectedServices: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  identity: identityDetailsSchema,
  uploadedFiles: z.record(z.string().trim().min(1).max(160), z.string().trim().min(1).max(500)).default({}),
  billing: z.object({
    fullName: z.string().trim().min(2).max(160),
    email: z.string().trim().email(),
    address: z.string().trim().min(5).max(500),
    method: z.enum(["invoice", "online"]),
  }),
});

export const businessHoursUpdateSchema = z.object({
  hours: z.array(businessHoursSchema).length(7),
});

export const businessAmenitiesUpdateSchema = z.object({
  amenities: z.array(z.object({
    id: z.string().trim().min(1).max(80),
    label: z.string().trim().min(1).max(120),
    custom: z.boolean().optional(),
  })).max(40),
});

export type BusinessLocationInput = z.infer<typeof businessLocationSchema>;
export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;
export type BusinessServiceInput = z.infer<typeof businessServiceSchema>;
export type ProviderApplicationInput = z.infer<typeof providerApplicationSchema>;
