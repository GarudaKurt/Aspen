import { conversations } from "../mock-data";
import type { Conversation } from "../types";

export function getConversations(): Conversation[] {
  return conversations.map((conversation) => ({
    ...conversation,
    messages: conversation.messages.map((message) => ({ ...message })),
  }));
}

export function getConversation(
  conversationsList: Conversation[],
  conversationId: string | null,
): Conversation | undefined {
  return conversationsList.find(({ id }) => id === conversationId);
}
