"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getConversation, getConversations } from "../api/queries";
import { createChatStore, useChatStore } from "../store/chat.store";
import type { Message } from "../types";
import {
  ChatHeader,
  ConversationList,
  MessageComposer,
  MessageList,
} from "./chat-components";

export function ChatView({
  navigation,
  currentUser = "provider",
}: {
  navigation?: ReactNode;
  currentUser?: Message["from"];
}) {
  const chatStore = useMemo(() => createChatStore(getConversations()), []);
  const chatState = useChatStore(chatStore);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const selected = useMemo(
    () => getConversation(chatState.conversations, chatState.selectedId),
    [chatState.conversations, chatState.selectedId],
  );
  const showMobileList = mobileListOpen || !selected;

  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !selected) return;
    chatStore.sendMessage(selected.id, body, currentUser);
    setDraft("");
  };

  const selectConversation = (id: string) => {
    chatStore.selectConversation(id);
    chatStore.markConversationRead(id);
    setMobileListOpen(false);
  };

  const editMessage = (messageId: string, body: string) => {
    if (selected) chatStore.editMessage(selected.id, messageId, body);
  };

  const confirmDeleteMessage = () => {
    if (selected && deleteMessageId) {
      chatStore.deleteMessage(selected.id, deleteMessageId);
    }
    setDeleteMessageId(null);
  };

  const confirmDelete = () => {
    if (deleteId) chatStore.archiveConversation(deleteId);
    setDeleteId(null);
  };

  return (
    <>
      {navigation}
      <h1 className="text-3xl font-bold">Chat</h1>
      <p className="mt-1 text-slate-500">
        Messages from customers about bookings and questions.
      </p>
      <Card className="mt-7 grid min-h-[560px] overflow-x-clip overflow-y-visible bg-white p-0 shadow-none lg:grid-cols-[280px_minmax(0,1fr)]">
        <ConversationList
          className={showMobileList ? "block" : "hidden lg:block"}
          conversations={chatState.conversations}
          selectedId={chatState.selectedId}
          onSelect={selectConversation}
          onDelete={setDeleteId}
          onArchive={chatStore.archiveConversation}
          onToggleMute={chatStore.toggleMute}
        />
        <div
          className={
            showMobileList
              ? "hidden min-h-[520px] min-w-0 flex-col lg:flex"
              : "flex min-h-[520px] min-w-0 flex-col"
          }
        >
          {selected ? (
            <>
              <ChatHeader
                conversation={selected}
                onBack={() => setMobileListOpen(true)}
              />
              <MessageList
                messages={selected.messages}
                currentUser={currentUser}
                onEdit={editMessage}
                onDelete={setDeleteMessageId}
              />
              <MessageComposer
                value={draft}
                onChange={setDraft}
                onSend={send}
              />
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-5 text-center text-slate-500">
              <div>
                <p>No conversation selected.</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3"
                  onClick={() =>
                    chatState.conversations[0] &&
                    selectConversation(chatState.conversations[0].id)
                  }
                >
                  Choose a conversation
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
      {deleteMessageId && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4"
          role="presentation"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-message-title"
            className="w-full max-w-sm rounded-xl border bg-white p-6 shadow-xl"
          >
            <h2 id="delete-message-title" className="text-lg font-semibold">
              Delete message?
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              This message will be marked as deleted for this conversation.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteMessageId(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={confirmDeleteMessage}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
      {deleteId && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4"
          role="presentation"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="w-full max-w-sm rounded-xl border bg-white p-6 shadow-xl"
          >
            <h2 id="delete-title" className="text-lg font-semibold">
              Delete conversation?
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              This removes the conversation from your inbox. This action cannot
              be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={confirmDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
