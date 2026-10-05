import type { Conversation, Message } from "../types";

const now = () => "Just now";

const createMessageId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `message-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function sendMessage(
  conversation: Conversation,
  body: string,
  from: Message["from"],
): Conversation {
  const trimmedBody = body.trim();
  if (!trimmedBody) return conversation;

  return {
    ...conversation,
    preview: trimmedBody,
    timestamp: now(),
    unreadCount: 0,
    messages: [
      ...conversation.messages,
      {
        id: createMessageId(),
        body: trimmedBody,
        timestamp: now(),
        from,
      },
    ],
  };
}

export function editMessage(
  conversation: Conversation,
  messageId: string,
  body: string,
): Conversation {
  const trimmedBody = body.trim();
  if (!trimmedBody) return conversation;

  return {
    ...conversation,
    messages: conversation.messages.map((message) =>
      message.id === messageId
        ? { ...message, body: trimmedBody, edited: true, timestamp: now() }
        : message,
    ),
  };
}

export function deleteMessage(
  conversation: Conversation,
  messageId: string,
): Conversation {
  return {
    ...conversation,
    messages: conversation.messages.map((message) =>
      message.id === messageId
        ? { ...message, body: "", deleted: true, timestamp: now() }
        : message,
    ),
  };
}

export function markConversationRead(conversation: Conversation): Conversation {
  return { ...conversation, unreadCount: 0 };
}

export function toggleConversationMute(
  conversation: Conversation,
): Conversation {
  return { ...conversation, muted: !conversation.muted };
}

export function removeConversation(
  conversations: Conversation[],
  conversationId: string,
): Conversation[] {
  return conversations.filter(({ id }) => id !== conversationId);
}
