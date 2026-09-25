import { BusinessAppointmentPage } from "@/features/appointments/components/business-appointment-page";

export default async function BusinessScopedAppointmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <BusinessAppointmentPage slug={slug} />;
}
