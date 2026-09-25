import type { TenantProfile } from "./profile.store";

export type ProfileSetupItem = {
  id: string;
  label: string;
  href: string;
  actionLabel?: string;
  complete: boolean;
};

export function getProfileSetupItems(
  profile: TenantProfile,
): ProfileSetupItem[] {
  const businessInfoComplete = Boolean(
    profile.name.trim() &&
      profile.address.trim() &&
      profile.description.trim(),
  );

  return [
    {
      id: "business-info",
      label: "Business info added",
      href: "/tenant-dashboard/profile",
      complete: businessInfoComplete,
    },
    {
      id: "identity",
      label: "Identity verified",
      href: "/tenant-dashboard/profile",
      complete: Boolean(profile.verified),
    },
    {
      id: "profile-photo",
      label: "Add a profile photo",
      href: "/tenant-dashboard/profile",
      actionLabel: "Add",
      complete: Boolean(profile.coverPhoto),
    },
    {
      id: "service-coverage",
      label: "Publish your first service",
      href: "/tenant-dashboard/services",
      actionLabel: "Add",
      complete: profile.serviceCoverage.length > 0,
    },
    {
      id: "availability",
      label: "Set your weekly availability",
      href: "/tenant-dashboard/calendar",
      actionLabel: "Setup",
      complete: profile.weeklyAvailabilitySet,
    },
  ];
}

export function getProfileCompletion(profile: TenantProfile): number {
  const items = getProfileSetupItems(profile);
  const completed = items.filter((item) => item.complete).length;
  return Math.round((completed / items.length) * 100);
}
