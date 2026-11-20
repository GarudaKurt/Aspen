import { SiteHeader } from "@/components/landing/site-header";
import { ChatView } from "@/features/chats";
import { requireUser } from "@/server/auth/guard";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CustomerChatsPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string; business?: string }>;
}) {
  const query = await searchParams;
  const conversation =
    typeof query.conversation === "string"
      ? query.conversation.slice(0, 36)
      : undefined;
  const business =
    typeof query.business === "string"
      ? query.business.slice(0, 160)
      : undefined;
  const destination = business
    ? `/chats?business=${encodeURIComponent(business)}`
    : conversation
      ? `/chats?conversation=${encodeURIComponent(conversation)}`
      : "/chats";
  const current = await requireUser(destination);
  if (!["customer", "provider"].includes(current.profile?.role ?? ""))
    redirect("/");

  return (
    <main className="min-h-screen bg-[#fafaf9] text-[#171817]">
      <SiteHeader />
      <section className="mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-8 sm:py-12 lg:px-12">
        <ChatView
          role="customer"
          userId={current.user.id}
          initialConversation={conversation}
          initialBusiness={business}
        />
      </section>
    </main>
  );
}
