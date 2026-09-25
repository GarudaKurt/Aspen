import { useSyncExternalStore } from "react";
import {
  deleteMessage,
  editMessage,
  markConversationRead,
  removeConversation,
  sendMessage,
  toggleConversationMute,
} from "../api/actions";
import { getConversations } from "../api/queries";
import type { Conversation, Message } from "../types";

export type ChatState = {
  conversations: Conversation[];
  selectedId: string | null;
};

type Listener = () => void;

export function createChatStore(
  initialConversations: Conversation[] = getConversations(),
) {
  let state: ChatState = {
    conversations: initialConversations,
    selectedId: initialConversations[0]?.id ?? null,
  };
  const listeners = new Set<Listener>();

  const update = (nextState: ChatState) => {
    state = nextState;
    listeners.forEach((listener) => listener());
  };

  const updateConversation = (
    conversationId: string,
    updateItem: (conversation: Conversation) => Conversation,
  ) => {
    update({
      ...state,
      conversations: state.conversations.map((conversation) =>
        conversation.id === conversationId
          ? updateItem(conversation)
          : conversation,
      ),
    });
  };

  return {
    getSnapshot: () => state,
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    selectConversation: (conversationId: string) => {
      update({ ...state, selectedId: conversationId });
    },
    markConversationRead: (conversationId: string) => {
      updateConversation(conversationId, markConversationRead);
    },
    sendMessage: (
      conversationId: string,
      body: string,
      from: Message["from"],
    ) => {
      updateConversation(conversationId, (conversation) =>
        sendMessage(conversation, body, from),
      );
    },
    editMessage: (conversationId: string, messageId: string, body: string) => {
      updateConversation(conversationId, (conversation) =>
        editMessage(conversation, messageId, body),
      );
    },
    deleteMessage: (conversationId: string, messageId: string) => {
      updateConversation(conversationId, (conversation) =>
        deleteMessage(conversation, messageId),
      );
    },
    archiveConversation: (conversationId: string) => {
      const conversations = removeConversation(state.conversations, conversationId);
      update({
        conversations,
        selectedId:
          state.selectedId === conversationId
            ? (conversations[0]?.id ?? null)
            : state.selectedId,
      });
    },
    toggleMute: (conversationId: string) => {
      updateConversation(conversationId, toggleConversationMute);
    },
  };
}

export type ChatStore = ReturnType<typeof createChatStore>;

export function useChatStore(store: ChatStore): ChatState {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
}
