import { requireUser } from "@/server/auth/guard";

export default async function RequestAppointmentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireUser("/request-appointment");
  return children;
}
