import type { Message } from "../types";

export type ChatRealtimeEvent =
  | { type: "message.created"; conversationId: string; message: Message }
  | { type: "message.updated"; conversationId: string; message: Message }
  | { type: "presence.updated"; conversationId: string; online: boolean };

export type ChatRealtimeListener = (event: ChatRealtimeEvent) => void;

export function subscribeToChat(
  conversationId: string,
  listener: ChatRealtimeListener,
): () => void {
  void conversationId;
  void listener;

  // Replace this no-op subscription with Supabase Realtime or another
  // provider without changing the chat components or store API.
  return () => undefined;
}
