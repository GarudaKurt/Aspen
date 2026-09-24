"use client";

import { useEffect, useRef, useState, type FormEvent, type TouchEvent } from "react";
import { Archive, BellOff, Check, MoreVertical, Phone, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Conversation, Message } from "../types";

export function ChatHeader({ conversation }: { conversation: Conversation }) {
  return <div className="flex items-center gap-3 border-b bg-white p-4">
    <Avatar conversation={conversation} />
    <div className="min-w-0 flex-1">
      <h2 className="truncate font-semibold">{conversation.name}</h2>
      <p className="flex items-center gap-1.5 text-sm text-slate-500">
        <span className={`size-2 rounded-full ${conversation.online ? "bg-emerald-500" : "bg-slate-300"}`} />
        {conversation.online ? "Active today" : "Offline"}
      </p>
    </div>
    <div className="flex items-center gap-1">
      <Button type="button" variant="ghost" size="icon" disabled title="Voice calls coming soon" aria-label="Start voice call"><Phone /></Button>
    </div>
  </div>;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onDelete,
  onArchive,
  onToggleMute,
}: {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onToggleMute: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const visible = conversations.filter((conversation) => conversation.name.toLowerCase().includes(query.toLowerCase()));
  return <section className="min-w-0 border-b lg:border-b-0 lg:border-r" aria-label="Conversations">
    <div className="p-4"><Input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search conversations" placeholder="Search conversations" /></div>
    <div className="max-h-[300px] overflow-x-clip overflow-y-auto lg:max-h-[500px]">
      {visible.length ? visible.map((conversation) => <ConversationItem key={conversation.id} conversation={conversation} selected={conversation.id === selectedId} onSelect={onSelect} onDelete={onDelete} onArchive={onArchive} onToggleMute={onToggleMute} />) : <p className="p-5 text-center text-sm text-slate-500">No conversations found.</p>}
    </div>
  </section>;
}

function ConversationItem({
  conversation,
  selected,
  onSelect,
  onDelete,
  onArchive,
  onToggleMute,
}: {
  conversation: Conversation;
  selected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onToggleMute: (id: string) => void;
}) {
  const [swiped, setSwiped] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const touch = useRef({ x: 0, y: 0 });

  const startTouch = (event: TouchEvent) => {
    const point = event.touches[0];
    touch.current = { x: point.clientX, y: point.clientY };
  };
  const moveTouch = (event: TouchEvent) => {
    const point = event.touches[0];
    const dx = point.clientX - touch.current.x;
    const dy = point.clientY - touch.current.y;
    if (Math.abs(dx) > Math.abs(dy) && dx < -24) setSwiped(true);
    if (dx > 24) setSwiped(false);
  };

  return <div className="relative overflow-x-clip overflow-y-visible border-t">
    <div className="absolute inset-y-0 right-0 flex items-center gap-1 bg-slate-100 px-2">
      <Button type="button" variant="ghost" size="icon-sm" onClick={() => onArchive(conversation.id)} title="Archive conversation" aria-label="Archive conversation"><Archive /></Button>
      <Button type="button" variant="ghost" size="icon-sm" onClick={() => onToggleMute(conversation.id)} title={conversation.muted ? "Unmute notifications" : "Mute notifications"} aria-label={conversation.muted ? "Unmute notifications" : "Mute notifications"}><BellOff /></Button>
      <Button type="button" variant="ghost" size="icon-sm" onClick={() => onDelete(conversation.id)} title="Delete conversation" aria-label="Delete conversation"><Trash2 /></Button>
    </div>
    <div className={`relative flex items-center gap-3 bg-white p-4 transition-transform duration-200 ${swiped ? "-translate-x-32" : "translate-x-0"} ${selected ? "bg-slate-50" : ""}`} onTouchStart={startTouch} onTouchMove={moveTouch} onTouchEnd={() => undefined}>
      <button type="button" onClick={() => { onSelect(conversation.id); setSwiped(false); }} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <Avatar conversation={conversation} />
        <span className="min-w-0 flex-1">
          <strong className="block truncate">{conversation.name}</strong>
          <small className="block truncate text-slate-500">{conversation.preview}</small>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1 text-xs text-slate-400"><span>{conversation.timestamp}</span>{conversation.unreadCount ? <span className="grid min-w-5 place-items-center rounded-full bg-[#3c6355] px-1 text-[10px] text-white">{conversation.unreadCount}</span> : null}</span>
      </button>
      <div className="relative hidden sm:block">
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Conversation actions"><MoreVertical /></Button>
        {menuOpen && <div className="absolute bottom-8 right-0 z-50 w-44 rounded-lg border bg-white p-1 shadow-lg">
          <ActionButton icon={Archive} label="Archive" onClick={() => onArchive(conversation.id)} />
          <ActionButton icon={BellOff} label={conversation.muted ? "Unmute" : "Mute"} onClick={() => onToggleMute(conversation.id)} />
          <ActionButton icon={Trash2} label="Delete" onClick={() => onDelete(conversation.id)} />
        </div>}
      </div>
    </div>
  </div>;
}

function ActionButton({ icon: Icon, label, onClick }: { icon: typeof Archive; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50"><Icon className="size-4" />{label}</button>;
}

function Avatar({ conversation }: { conversation: Conversation }) {
  return <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-sky-100 font-semibold text-sky-600">{conversation.initials}<span className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-white ${conversation.online ? "bg-emerald-500" : "bg-slate-300"}`} /></span>;
}

export function MessageList({
  messages,
  onEdit,
  onDelete,
}: {
  messages: Message[];
  onEdit: (messageId: string, body: string) => void;
  onDelete: (messageId: string) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);
  if (!messages.length) return <div className="grid flex-1 place-items-center p-5 text-sm text-slate-500">No messages yet. Start the conversation below.</div>;
  return <div className="min-w-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto p-5">{messages.map((message) => <MessageBubble key={message.id} message={message} onEdit={onEdit} onDelete={onDelete} />)}<div ref={endRef} /></div>;
}

function MessageBubble({
  message,
  onEdit,
  onDelete,
}: {
  message: Message;
  onEdit: (messageId: string, body: string) => void;
  onDelete: (messageId: string) => void;
}) {
  const sent = message.from === "provider";
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draft, setDraft] = useState(message.body);

  if (message.deleted) return <div className="flex justify-end"><p className="rounded-2xl bg-slate-100 px-4 py-2 text-sm italic text-slate-400">Message deleted</p></div>;

  if (editing) return <div className="flex justify-end"><form onSubmit={(event) => { event.preventDefault(); const body = draft.trim(); if (body) onEdit(message.id, body); setEditing(false); }} className="flex w-full max-w-[75%] gap-2"><Input value={draft} onChange={(event) => setDraft(event.target.value)} aria-label="Edit message" autoFocus /><Button type="submit" size="icon-sm" aria-label="Save message"><Check /></Button><Button type="button" variant="ghost" size="icon-sm" onClick={() => { setDraft(message.body); setEditing(false); }} aria-label="Cancel editing"><X /></Button></form></div>;

  return <div className={`flex min-w-0 ${sent ? "justify-end" : "justify-start"}`}>
    <div className={`group relative min-w-0 max-w-[min(75%,28rem)] rounded-2xl px-4 py-2 text-sm ${sent ? "bg-[#3c6355] text-white" : "bg-slate-100 text-slate-800"}`}>
      <p className="break-words [overflow-wrap:anywhere]">{message.body}</p>
      <span className="mt-1 block text-[10px] opacity-70">{message.edited ? "Edited · " : ""}{message.timestamp}</span>
      {sent && <div className="absolute right-1 top-1 z-30">
        <Button type="button" variant="ghost" size="icon-sm" className="text-current hover:bg-white/15" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Message actions"><MoreVertical /></Button>
        {menuOpen && <div className="absolute bottom-8 right-0 z-[60] w-40 rounded-lg border bg-white p-1 text-slate-800 shadow-xl">
          <ActionButton icon={Check} label="Edit message" onClick={() => { setDraft(message.body); setMenuOpen(false); setEditing(true); }} />
          <ActionButton icon={Trash2} label="Delete message" onClick={() => { setMenuOpen(false); onDelete(message.id); }} />
        </div>}
      </div>}
    </div>
  </div>;
}


export function MessageComposer({ value, onChange, onSend }: { value: string; onChange: (value: string) => void; onSend: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form onSubmit={onSend} className="flex gap-2 border-t bg-white p-4"><Input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Write a reply..." aria-label="Write a reply" /><Button type="submit" size="icon" className="bg-[#3c6355] text-white" aria-label="Send message"><Send /></Button></form>;
}
