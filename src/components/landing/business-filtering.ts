import type { BusinessCardProps } from "./business-card";

const serviceAliases: Record<string, string[]> = {
  "vet clinics": ["vet clinics", "veterinary", "vet clinic"],
  veterinary: ["vet clinics", "veterinary", "vet clinic"],
  "pet supplies": ["pet supplies", "pet supply"],
  grooming: ["grooming"],
  boarding: ["boarding"],
  training: ["training"],
};

function matchesServiceCategory(
  business: BusinessCardProps,
  category: string,
) {
  const normalizedCategory = category.trim().toLowerCase();
  if (!normalizedCategory || normalizedCategory === "all services") return true;

  const aliases = serviceAliases[normalizedCategory] ?? [normalizedCategory];
  const values = [
    business.services,
    ...(business.servicesOffered ?? []).flatMap((service) => [
      service.category,
      service.title,
    ]),
  ].map((value) => value.toLowerCase());

  return aliases.some((alias) =>
    values.some((value) => value.includes(alias)),
  );
}

export function filterBusinesses(
  businesses: BusinessCardProps[],
  query: string,
  city: string,
  serviceFilters: string[],
) {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedCity = city.trim().toLowerCase();

  return businesses.filter((business) => {
    const searchableText = [
      business.businessName,
      business.location,
      business.services,
      ...(business.servicesOffered ?? []).flatMap((service) => [
        service.category,
        service.title,
        service.description,
      ]),
    ]
      .join(" ")
      .toLowerCase();

    const matchesQuery =
      !normalizedQuery || searchableText.includes(normalizedQuery);
    const registeredCity =
      business.locationDetails?.cityMunicipality?.trim().toLowerCase() ?? "";
    const locationText = business.location.toLowerCase();
    const matchesCity =
      !normalizedCity ||
      normalizedCity === "all cities" ||
      registeredCity === normalizedCity ||
      locationText.includes(normalizedCity);
    const matchesFilters = serviceFilters.every((filter) =>
      matchesServiceCategory(business, filter),
    );

    return matchesQuery && matchesCity && matchesFilters;
  });
}
