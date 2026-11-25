import { requireUser } from "@/server/auth/guard";
import { Suspense, type ReactNode } from "react";
import { AppointmentSkeleton } from "@/components/loading/skeletons";

export const dynamic = "force-dynamic";

export default function BusinessAppointmentLayout(props: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<AppointmentSkeleton />}>
      <AuthorizedBusinessAppointment {...props} />
    </Suspense>
  );
}

async function AuthorizedBusinessAppointment({
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
