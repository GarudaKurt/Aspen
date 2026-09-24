"use client";

import { FormEvent, useMemo, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { conversations as initialConversations } from "../mock-data";
import type { Conversation } from "../types";
import { MobileDashboardNav } from "./dashboard-shell";

export function ChatView() {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversations[0]?.id ?? null);
  const [draft, setDraft] = useState("");
  const selected = useMemo(() => conversations.find((item) => item.id === selectedId), [conversations, selectedId]);
  const send = (event: FormEvent) => { event.preventDefault(); const body = draft.trim(); if (!body || !selected) return; setConversations((items) => items.map((conversation) => conversation.id === selected.id ? { ...conversation, messages: [...conversation.messages, { id: crypto.randomUUID(), body, timestamp: "Just now", from: "provider" }] } : conversation)); setDraft(""); };
  return <><MobileDashboardNav /><h1 className="text-3xl font-bold">Chat</h1><p className="mt-1 text-slate-500">Messages from customers about bookings and questions.</p><Card className="mt-7 grid min-h-[560px] overflow-hidden bg-white p-0 shadow-none lg:grid-cols-[280px_minmax(0,1fr)]">
    <div className="border-b lg:border-b-0 lg:border-r"><div className="p-4"><Input aria-label="Search conversations" placeholder="Search conversations" /></div><div>{conversations.map((conversation)=><button type="button" key={conversation.id} onClick={()=>setSelectedId(conversation.id)} className={`flex w-full items-center gap-3 border-t p-4 text-left ${selectedId===conversation.id?"bg-slate-50":""}`}><span className="grid size-11 shrink-0 place-items-center rounded-full bg-sky-100 font-semibold text-sky-600">{conversation.initials}</span><span className="min-w-0 flex-1"><strong className="block truncate">{conversation.name}</strong><small className="block truncate text-slate-500">{conversation.preview}</small></span><small className="self-start text-slate-400">{conversation.timestamp}</small></button>)}</div></div>
    <div className="flex min-h-[520px] flex-col">{selected ? <><div className="flex items-center gap-3 border-b p-4"><span className="grid size-11 place-items-center rounded-full bg-sky-100 font-semibold text-sky-600">{selected.initials}</span><div><h2 className="font-semibold">{selected.name}</h2><p className="text-sm text-slate-500">{selected.online ? "Active today" : "Offline"}</p></div></div><div className="flex-1 space-y-3 overflow-y-auto p-5">{selected.messages.map((message)=><div key={message.id} className={`flex ${message.from==="provider"?"justify-end":""}`}><p className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${message.from==="provider"?"bg-[#3c6355] text-white":"bg-slate-100 text-slate-800"}`}>{message.body}<span className="mt-1 block text-[10px] opacity-70">{message.timestamp}</span></p></div>)}</div><form onSubmit={send} className="flex gap-2 border-t p-4"><Input value={draft} onChange={(e)=>setDraft(e.target.value)} placeholder="Write a reply..." /><Button type="submit" size="icon" className="bg-[#3c6355] text-white"><Send /></Button></form></> : <div className="grid flex-1 place-items-center text-slate-500">Select a conversation to start chatting.</div>}</div>
  </Card></>;
}
