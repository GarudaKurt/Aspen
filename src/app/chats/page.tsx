import { SiteHeader } from "@/components/landing/site-header";
import { ChatView } from "@/features/chats";
import { requireUser } from "@/server/auth/guard";

export const dynamic = "force-dynamic";

export default async function CustomerChatsPage() {
  await requireUser("/chats");

  return (
    <main className="min-h-screen bg-[#fafaf9] text-[#171817]">
      <SiteHeader />
      <section className="mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-8 sm:py-12 lg:px-12">
        <ChatView role="customer" />
      </section>
    </main>
  );
}
