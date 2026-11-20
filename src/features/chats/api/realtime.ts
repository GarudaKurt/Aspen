import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

/** Realtime invalidates the view; authenticated HTTP reads reconcile records. */
export function subscribeToChat(
  userId: string,
  conversation: string | null,
  refresh: () => void,
  connection: (live: boolean) => void,
) {
  const client = getSupabaseBrowserClient();
  let disposed = false;
  const channel = client.channel(
    `chat:${conversation ?? userId}:${crypto.randomUUID()}`,
  );
  if (conversation) {
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chat_messages",
        filter: `conversation_id=eq.${conversation}`,
      },
      refresh,
    );
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "chat_participants",
        filter: `conversation_id=eq.${conversation}`,
      },
      refresh,
    );
  } else
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chat_participants",
        filter: `user_id=eq.${userId}`,
      },
      refresh,
    );
  channel.subscribe((status) => {
    if (disposed) return;
    connection(status === "SUBSCRIBED");
    if (status === "SUBSCRIBED") refresh();
  });
  return () => {
    disposed = true;
    void client.removeChannel(channel);
  };
}
