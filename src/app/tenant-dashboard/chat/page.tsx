import { ChatView } from "@/features/chats";
import { MobileDashboardNav } from "@/features/tenant-dashboard/components/dashboard-shell";

export default function TenantChatPage() {
  return <ChatView navigation={<MobileDashboardNav />} />;
}
