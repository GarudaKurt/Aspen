"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { conversations as initialConversations } from "../mock-data";
import type { Conversation } from "../types";
import { MobileDashboardNav } from "./dashboard-shell";
import { ChatHeader, ConversationList, MessageComposer, MessageList } from "./chat-components";

export function ChatView() {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversations[0]?.id ?? null);
  const [draft, setDraft] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const selected = useMemo(() => conversations.find((item) => item.id === selectedId), [conversations, selectedId]);

  const updateConversation = (id: string, update: (conversation: Conversation) => Conversation) => {
    setConversations((items) => items.map((conversation) => conversation.id === id ? update(conversation) : conversation));
  };

  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !selected) return;
    updateConversation(selected.id, (conversation) => ({
      ...conversation,
      preview: body,
      timestamp: "Just now",
      unreadCount: 0,
      messages: [...conversation.messages, { id: crypto.randomUUID(), body, timestamp: "Just now", from: "provider" }],
    }));
    setDraft("");
  };

  const selectConversation = (id: string) => {
    setSelectedId(id);
    updateConversation(id, (conversation) => ({ ...conversation, unreadCount: 0 }));
  };

  const archiveConversation = (id: string) => {
    setConversations((items) => items.filter((conversation) => conversation.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const toggleMute = (id: string) => {
    updateConversation(id, (conversation) => ({ ...conversation, muted: !conversation.muted }));
  };

  const confirmDelete = () => {
    if (deleteId) archiveConversation(deleteId);
    setDeleteId(null);
  };

  return <>
    <MobileDashboardNav />
    <h1 className="text-3xl font-bold">Chat</h1>
    <p className="mt-1 text-slate-500">Messages from customers about bookings and questions.</p>
    <Card className="mt-7 grid min-h-[560px] overflow-hidden bg-white p-0 shadow-none lg:grid-cols-[280px_minmax(0,1fr)]">
      <ConversationList conversations={conversations} selectedId={selectedId} onSelect={selectConversation} onDelete={setDeleteId} onArchive={archiveConversation} onToggleMute={toggleMute} />
      <div className="flex min-h-[520px] flex-col">
        {selected ? <><ChatHeader conversation={selected} /><MessageList messages={selected.messages} /><MessageComposer value={draft} onChange={setDraft} onSend={send} /></> : <div className="grid flex-1 place-items-center p-5 text-center text-slate-500"><div><p>No conversation selected.</p><Button type="button" variant="outline" className="mt-3" onClick={() => conversations[0] && selectConversation(conversations[0].id)}>Choose a conversation</Button></div></div>}
      </div>
    </Card>
    {deleteId && <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" role="presentation">
      <div role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-sm rounded-xl border bg-white p-6 shadow-xl">
        <h2 id="delete-title" className="text-lg font-semibold">Delete conversation?</h2>
        <p className="mt-2 text-sm text-slate-500">This removes the conversation from your inbox. This action cannot be undone.</p>
        <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button><Button type="button" className="bg-red-600 text-white hover:bg-red-700" onClick={confirmDelete}>Delete</Button></div>
      </div>
    </div>}
  </>;
}
