"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, BellOff, MessageCircle, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatAction } from "../api/actions";
import { chatQuery } from "../api/queries";
import { useInbox, useMessages } from "../use-chat";
import {
  ChatAvatar,
  ChatNotice,
  ChatSkeleton,
  ConversationActions,
  MessageEditor,
  MessageHistory,
} from "./chat-components";
import type { ChatRole, Conversation, Message } from "../types";

export function ChatView({
  role,
  userId,
  initialConversation,
  initialBusiness,
}: {
  role: ChatRole;
  userId: string;
  initialConversation?: string;
  initialBusiness?: string;
}) {
  const router = useRouter();
  const [archived, setArchived] = useState(false);
  const inbox = useInbox(userId, role, archived);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [opening, setOpening] = useState(false);
  const [retry, setRetry] = useState(0);
  const route = role === "provider" ? "/tenant-dashboard/chat" : "/chats";
  useEffect(() => {
    if (!initialConversation && !initialBusiness) return;
    const controller = new AbortController();
    const openConversation = async () => {
      setOpening(true);
      setError("");
      try {
        let id = initialConversation;
        if (initialBusiness && role === "customer") {
          const result = await chatAction({
            action: "start",
            slug: initialBusiness,
          });
          if (!result.ok) throw new Error(result.error);
          id = result.conversation;
        }
        if (!id || controller.signal.aborted) return;
        const detail = await chatQuery<Conversation>(
          { op: "detail", role, conversation: id },
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setSelected(detail);
          router.replace(`${route}?conversation=${id}`, { scroll: false });
        }
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not open conversation.",
          );
      } finally {
        if (!controller.signal.aborted) setOpening(false);
      }
    };
    // Cancel React's development setup/cleanup probe before issuing a mutation.
    const timer = setTimeout(() => void openConversation(), 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [initialBusiness, initialConversation, role, route, router, retry]);
  const active =
    inbox.items.find((item) => item.id === selected?.id) ?? selected;
  const rows = inbox.items.filter((item) =>
    `${item.name} ${item.preview}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section aria-label="Chats" className="min-w-0 text-[#242524]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {role === "provider"
              ? "Keep in touch with your customers."
              : "Your conversations with local pet care providers."}
          </p>
        </div>
        <span
          role="status"
          className="mt-2 shrink-0 text-xs text-muted-foreground"
        >
          {inbox.live ? "Connected" : "Reconnecting…"}
        </span>
      </div>
      {error && (
        <ChatNotice retry={() => setRetry((value) => value + 1)}>
          {error}
        </ChatNotice>
      )}
      {opening && !active && (
        <p
          role="status"
          className="mb-3 text-sm text-muted-foreground md:hidden"
        >
          Opening your conversation…
        </p>
      )}
      <div className="grid h-[min(740px,78dvh)] min-h-[420px] overflow-hidden rounded-2xl border bg-white md:grid-cols-[290px_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside
          aria-label="Conversations"
          className={`min-h-0 flex-col border-r ${active ? "hidden md:flex" : "flex"}`}
        >
          <div className="space-y-3 border-b p-4">
            <div className="flex gap-1 rounded-lg bg-[#f3f5f3] p-1">
              {[false, true].map((folder) => (
                <Button
                  key={String(folder)}
                  variant="ghost"
                  size="sm"
                  aria-pressed={archived === folder}
                  className={`flex-1 ${archived === folder ? "bg-white shadow-sm" : ""}`}
                  onClick={() => setArchived(folder)}
                >
                  {folder ? "Archived" : "Inbox"}
                </Button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                aria-label="Search loaded conversations"
                placeholder="Search conversations"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          {inbox.error && (
            <ChatNotice retry={inbox.refresh}>{inbox.error}</ChatNotice>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {inbox.loading ? (
              <ChatSkeleton />
            ) : !rows.length ? (
              <div className="px-5 py-14 text-center">
                <MessageCircle className="mx-auto mb-3 size-7 text-[#789286]" />
                <p className="text-sm font-medium">
                  {search
                    ? "No matching conversations"
                    : archived
                      ? "Nothing archived"
                      : "No conversations yet"}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {search
                    ? "Search applies to loaded conversations. Load more below."
                    : role === "provider"
                      ? "Customer messages will appear here."
                      : "Open a business profile and select Message to get started."}
                </p>
              </div>
            ) : (
              rows.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  aria-current={active?.id === item.id ? "true" : undefined}
                  onClick={() => {
                    setSelected(item);
                    router.replace(`${route}?conversation=${item.id}`, {
                      scroll: false,
                    });
                  }}
                  className={`mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-[#f3f6f4] focus-visible:outline-2 focus-visible:outline-[#3c6355] ${active?.id === item.id ? "bg-[#eaf0ed]" : ""}`}
                >
                  <ChatAvatar
                    key={item.photo_id ?? item.id}
                    conversation={item}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">
                        {item.name}
                      </span>
                      {item.muted && (
                        <BellOff className="size-3 shrink-0 text-muted-foreground" />
                      )}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {item.preview}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-2">
                    <time
                      className="text-[10px] text-muted-foreground"
                      dateTime={item.last_activity_at}
                    >
                      {new Date(item.last_activity_at).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric" },
                      )}
                    </time>
                    {item.unread_count > 0 && (
                      <span
                        aria-label={`${item.unread_count} unread messages`}
                        className="flex min-w-5 items-center justify-center rounded-full bg-[#3c6355] px-1.5 text-[10px] leading-5 text-white"
                      >
                        {item.unread_count > 99 ? "99+" : item.unread_count}
                      </span>
                    )}
                  </span>
                </button>
              ))
            )}
            {inbox.next && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => void inbox.loadMore()}
              >
                Load more conversations
              </Button>
            )}
          </div>
        </aside>
        {active ? (
          <ConversationPanel
            key={active.id}
            conversation={active}
            userId={userId}
            onBack={() => {
              setSelected(null);
              router.replace(route, { scroll: false });
            }}
            onChange={(change) => {
              if (change.hidden || change.archived !== undefined) {
                setSelected(null);
                router.replace(route, { scroll: false });
              } else
                setSelected((prior) =>
                  prior ? { ...prior, ...change } : prior,
                );
              inbox.refresh();
            }}
          />
        ) : (
          <div className="hidden flex-col items-center justify-center p-8 text-center md:flex">
            <span className="mb-5 rounded-2xl bg-[#edf3ef] p-5 text-[#3c6355]">
              <MessageCircle className="size-8" />
            </span>
            <h2 className="font-semibold">
              {opening
                ? "Opening your conversation…"
                : "Good care starts with a conversation"}
            </h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Select a conversation to view messages and continue where you left
              off.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function ConversationPanel({
  conversation,
  userId,
  onBack,
  onChange,
}: {
  conversation: Conversation;
  userId: string;
  onBack: () => void;
  onChange: (change: {
    archived?: boolean;
    muted?: boolean;
    hidden?: boolean;
  }) => void;
}) {
  const history = useMessages(userId, conversation.id);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<{
    id: string;
    body: string;
    error?: string;
  } | null>(null);
  const [working, setWorking] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<{
    message: Message;
    deleting: boolean;
  } | null>(null);
  const waiting =
    pending &&
    !history.messages.some((message) => message.client_id === pending.id)
      ? pending
      : null;
  const performSend = async (retry?: typeof pending) => {
    if (busy.current || (!retry && (!draft.trim() || waiting))) return;
    const outgoing = retry ?? { id: crypto.randomUUID(), body: draft.trim() };
    busy.current = true;
    setPending(outgoing);
    if (!retry) setDraft("");
    try {
      const result = await chatAction({
        action: "send",
        conversation: conversation.id,
        clientId: outgoing.id,
        body: outgoing.body,
      });
      if (!result.ok) throw new Error(result.error);
      if (result.message) history.accept(result.message);
      setPending(null);
    } catch (failure) {
      setPending({
        ...outgoing,
        error:
          failure instanceof Error
            ? failure.message
            : "Connection interrupted. Retry to confirm delivery.",
      });
    } finally {
      busy.current = false;
    }
  };
  const { read } = history;
  const markRead = useCallback(
    (seq: number) => {
      void read(seq);
    },
    [read],
  );
  return (
    <div className="flex min-h-0 min-w-0 flex-col">
      <header className="flex min-h-20 items-center gap-3 border-b px-3 sm:px-5">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label="Back to conversations"
          className="shrink-0 md:hidden"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <ChatAvatar
          key={conversation.photo_id ?? conversation.id}
          conversation={conversation}
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">
            {conversation.name}
          </h2>
          {conversation.participant_role === "customer" ? (
            <Link
              href={`/business-profile/${conversation.business_slug}`}
              className="text-xs text-[#3c6355] underline-offset-2 hover:underline"
            >
              View business profile
            </Link>
          ) : (
            <p className="text-xs text-muted-foreground">
              Customer conversation
            </p>
          )}
        </div>
        <ConversationActions
          conversation={conversation}
          disabled={working}
          onChange={async (change) => {
            if (working) return;
            setWorking(true);
            setError("");
            try {
              const result = await chatAction({
                action: "preferences",
                conversation: conversation.id,
                ...change,
              });
              if (!result.ok) throw new Error(result.error);
              onChange(change);
            } catch (failure) {
              setError(
                failure instanceof Error
                  ? failure.message
                  : "Could not update conversation.",
              );
            } finally {
              setWorking(false);
            }
          }}
        />
      </header>
      {!history.live && (
        <p
          role="status"
          className="border-b bg-amber-50 px-4 py-2 text-xs text-amber-900"
        >
          Reconnecting to live updates. Messages are also checked periodically.
        </p>
      )}
      {(history.error || error) && (
        <ChatNotice retry={history.refresh}>
          {history.error || error}
        </ChatNotice>
      )}
      {history.loading ? (
        <div className="flex-1">
          <ChatSkeleton />
        </div>
      ) : (
        <MessageHistory
          messages={history.messages}
          userId={userId}
          recipientRead={history.recipientRead}
          before={history.before}
          loadOlder={history.loadOlder}
          onRead={markRead}
          onEdit={(message) => setEditor({ message, deleting: false })}
          onDelete={(message) => setEditor({ message, deleting: true })}
          footer={
            waiting ? (
              <div className="ml-auto mb-4 max-w-[85%] rounded-xl border border-dashed p-3 text-sm">
                <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {waiting.body}
                </p>
                <p role="status" className="mt-2 text-xs text-muted-foreground">
                  {waiting.error ?? "Sending…"}
                </p>
                {waiting.error && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => void performSend(waiting)}
                  >
                    Retry message
                  </Button>
                )}
              </div>
            ) : undefined
          }
        />
      )}
      <form
        className="border-t p-3 sm:p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void performSend();
        }}
      >
        <div className="flex items-end gap-2 rounded-xl border p-2 focus-within:ring-1 focus-within:ring-[#3c6355]">
          <textarea
            aria-label={`Message ${conversation.name}`}
            placeholder="Write a message…"
            maxLength={4000}
            rows={2}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="max-h-36 min-h-12 flex-1 resize-none bg-transparent p-1 text-sm outline-none"
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                if (!waiting) void performSend();
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send message"
            disabled={!draft.trim() || !!waiting || history.loading}
            className="shrink-0 rounded-lg bg-[#3c6355] text-white hover:bg-[#2f5044]"
          >
            <Send className="size-4" />
          </Button>
        </div>
        <div className="mt-2 flex justify-between gap-3 text-[10px] text-muted-foreground">
          <span>Enter to send · Shift + Enter for a new line</span>
          <span>{draft.length.toLocaleString()} / 4,000</span>
        </div>
        {waiting?.error && (
          <p className="mt-2 text-xs text-amber-800">
            Retry the pending message before sending another. The same retry ID
            prevents duplicate delivery.
          </p>
        )}
      </form>
      {editor && (
        <MessageEditor
          key={`${editor.message.id}:${editor.deleting}`}
          message={editor.message}
          deleting={editor.deleting}
          onClose={() => setEditor(null)}
          onSave={async (body) => {
            try {
              const result = await chatAction(
                editor.deleting
                  ? {
                      action: "delete",
                      message: editor.message.id,
                      version: editor.message.updated_at,
                    }
                  : {
                      action: "edit",
                      message: editor.message.id,
                      version: editor.message.updated_at,
                      body,
                    },
              );
              if (!result.ok) return result.error;
              if (result.message) history.accept(result.message);
              return null;
            } catch {
              return "Could not save. Please retry.";
            }
          }}
        />
      )}
    </div>
  );
}
