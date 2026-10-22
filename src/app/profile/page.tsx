import type { HeaderUser } from "@/components/landing/user-account-menu";
import { SiteHeader } from "@/components/landing/site-header";
import { CustomerProfilePage } from "@/features/account/components/customer-profile-page";
import { requireUser } from "@/server/auth/guard";

function toProfileUser(current: Awaited<ReturnType<typeof requireUser>>): HeaderUser {
  const metadata = current.user.user_metadata ?? {};
  const email = current.user.email ?? current.profile?.email ?? "";
  const displayName =
    current.profile?.display_name ||
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    email.split("@")[0] ||
    "Aspen customer";

  return {
    id: current.user.id,
    email,
    displayName,
    avatarUrl:
      current.profile?.avatar_url ||
      (typeof metadata.avatar_url === "string" ? metadata.avatar_url : null) ||
      (typeof metadata.picture === "string" ? metadata.picture : null),
    emailConfirmedAt: current.user.email_confirmed_at ?? null,
  };
}

export default async function CustomerProfileRoute() {
  const current = await requireUser("/profile");
  const user = toProfileUser(current);

  return (
    <>
      <SiteHeader />
      <CustomerProfilePage user={user} />
    </>
  );
}
