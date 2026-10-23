import type { BusinessLocationDetails } from "@/features/business-profile/location";
import type { BusinessHoursDay } from "@/features/business-profile/business-hours";
import type { BusinessAmenity } from "@/features/business-profile/amenities";

export type BusinessStatus = "draft" | "pending" | "published" | "rejected" | "archived";
export type ProviderApplicationStatus = "pending" | "approved" | "rejected" | "withdrawn";

export type TenancyBusiness = {
  id: string;
  ownerId: string;
  slug: string;
  name: string;
  providerType: string;
  description: string;
  yearsExperience: number | null;
  facebookPage: string;
  status: BusinessStatus;
  verified: boolean;
  coverPhotoPath: string | null;
  location?: BusinessLocationDetails;
  hours: BusinessHoursDay[];
  amenities: BusinessAmenity[];
};

export type TenancyService = {
  id: string;
  businessId: string;
  category: string;
  title: string;
  description: string;
  price: string;
  duration: string;
  status: "Active" | "Draft" | "Paused";
  photos: string[];
};

export type ProviderApplicationSummary = {
  id: string;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  businessId: string | null;
  businessName: string;
  reviewNotes: string | null;
  submittedAt: string;
  reviewedAt: string | null;
};

export type ProviderApplication = {
  id: string;
  applicantId: string;
  status: ProviderApplicationStatus;
  businessName: string;
  submittedAt: string;
};
