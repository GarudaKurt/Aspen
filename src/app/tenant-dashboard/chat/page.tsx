import { ChatView } from "@/features/chats";
import { requireRole } from "@/server/auth/guard";

export default async function TenantChatPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const query = await searchParams;
  const conversation =
    typeof query.conversation === "string"
      ? query.conversation.slice(0, 36)
      : undefined;
  const current = await requireRole(
    "provider",
    conversation
      ? `/tenant-dashboard/chat?conversation=${encodeURIComponent(conversation)}`
      : "/tenant-dashboard/chat",
  );
  return (
    <ChatView
      role="provider"
      userId={current.user.id}
      initialConversation={conversation}
    />
  );
}
