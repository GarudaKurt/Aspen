import { conversations } from "../mock-data";
import type { Conversation } from "../types";

export type ChatRole = "customer" | "provider";

export function getConversations(): Conversation[] {
  return conversations.map((conversation) => ({
    ...conversation,
    messages: conversation.messages.map((message) => ({ ...message })),
  }));
}

/**
 * The provider inbox currently uses the existing demo conversations. Customer
 * conversations must come from an authenticated data source; returning an
 * empty list here prevents provider demo records from leaking into customer UI.
 */
export function getConversationsForRole(role: ChatRole): Conversation[] {
  return role === "provider" ? getConversations() : [];
}

export function getConversation(
  conversationsList: Conversation[],
  conversationId: string | null,
): Conversation | undefined {
  return conversationsList.find(({ id }) => id === conversationId);
}
