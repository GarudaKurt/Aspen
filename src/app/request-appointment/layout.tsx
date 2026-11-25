import { requireUser } from "@/server/auth/guard";
import { Suspense, type ReactNode } from "react";
import { AppointmentSkeleton } from "@/components/loading/skeletons";

export const dynamic = "force-dynamic";

export default function RequestAppointmentLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<AppointmentSkeleton />}>
      <AuthorizedAppointment>{children}</AuthorizedAppointment>
    </Suspense>
  );
}

async function AuthorizedAppointment({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireUser("/request-appointment");
  return children;
}
