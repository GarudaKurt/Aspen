import { requireUser } from "@/server/auth/guard";

export const dynamic = "force-dynamic";

export default async function BusinessAppointmentLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;
  await requireUser(`/business-profile/${slug}/request-appointment`);
  return children;
}
