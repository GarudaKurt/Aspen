import { notFound } from "next/navigation";
import { mockBusinesses } from "@/components/landing/mock-businesses";
import { AppointmentPage } from "./appointment-page";

export async function BusinessAppointmentPage({ slug }: { slug: string }) {
  const business = mockBusinesses.find((item) => item.slug === slug);

  if (!business) notFound();

  return (
    <AppointmentPage
      businessSlug={slug}
      businessName={business.businessName}
      businessLocation={business.location}
      businessCategory={business.services}
      businessRating={business.rating.split(" ")[0]}
      services={business.servicesOffered ?? []}
    />
  );
}
