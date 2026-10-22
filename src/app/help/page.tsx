import { SiteHeader } from "@/components/landing/site-header";
import { HelpCenter } from "@/features/help/components/help-center";
import { requireUser } from "@/server/auth/guard";

export default async function CustomerHelpPage() {
  await requireUser("/help");

  return (
    <>
      <SiteHeader />
      <HelpCenter />
    </>
  );
}
