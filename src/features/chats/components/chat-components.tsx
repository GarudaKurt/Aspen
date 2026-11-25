"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import {
  Archive,
  BellOff,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "../model";
import type { Conversation, Message } from "../types";

export function ChatAvatar({ conversation }: { conversation: Conversation }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#eaf0ed] text-sm font-semibold text-[#3c6355]">
      {conversation.photo_id && !failed ? (
        <Image
          src={`/api/business-photos/${conversation.photo_id}`}
          alt=""
          fill
          sizes="40px"
          unoptimized
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials(conversation.name)
      )}
    </span>
  );
}

export function ChatNotice({
  children,
  retry,
}: {
  children: ReactNode;
  retry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="m-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
    >
      {children}
      {retry && (
        <Button variant="ghost" size="sm" className="ml-2" onClick={retry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function ConversationActions({
  conversation,
  onChange,
  disabled,
}: {
  conversation: Conversation;
  disabled: boolean;
  onChange: (change: {
    archived?: boolean;
    muted?: boolean;
    hidden?: boolean;
  }) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Conversation options"
            disabled={disabled}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          onClick={() => onChange({ archived: !conversation.archived })}
        >
          <Archive className="size-4" />
          {conversation.archived ? "Move to inbox" : "Archive conversation"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onChange({ muted: !conversation.muted })}
        >
          <BellOff className="size-4" />
          {conversation.muted ? "Unmute alerts" : "Mute alerts"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange({ hidden: true })}>
          <Trash2 className="size-4" />
          Hide from my inbox
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MessageEditor({
  message,
  deleting,
  onClose,
  onSave,
}: {
  message: Message | null;
  deleting: boolean;
  onClose: () => void;
  onSave: (body: string) => Promise<string | null>;
}) {
  const [body, setBody] = useState(message?.body ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog.Root
      open={!!message}
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[1100] bg-black/40" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-[1101] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-white p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold">
            {deleting ? "Delete this message?" : "Edit message"}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            {deleting
              ? "The message will be replaced with a deleted-message notice for both participants."
              : "You can edit your messages for 15 minutes after sending."}
          </Dialog.Description>
          {!deleting && (
            <textarea
              aria-label="Message text"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={4000}
              rows={5}
              className="mt-4 w-full resize-none rounded-lg border p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#3c6355]"
            />
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" disabled={saving} onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={saving || (!deleting && !body.trim())}
              className={
                deleting ? "bg-red-700 text-white" : "bg-[#3c6355] text-white"
              }
              onClick={async () => {
                setSaving(true);
                const failure = await onSave(body);
                setSaving(false);
                if (failure) setError(failure);
                else onClose();
              }}
            >
              {saving ? "Saving…" : deleting ? "Delete" : "Save changes"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function MessageHistory({
  messages,
  userId,
  recipientRead,
  before,
  loadOlder,
  onRead,
  onEdit,
  onDelete,
  footer,
}: {
  messages: Message[];
  userId: string;
  recipientRead: number;
  before: number | null;
  loadOlder: (beforeInsert?: () => void) => Promise<void>;
  onRead: (seq: number) => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
  footer?: ReactNode;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const bottom = useRef(true);
  const latest = useRef<Message | undefined>(undefined);
  const anchor = useRef<{ height: number; top: number } | null>(null);
  const [older, setOlder] = useState(false);
  const [error, setError] = useState("");
  const [newMessages, setNewMessages] = useState(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const newest = messages.at(-1);
  useEffect(() => {
    const box = scroll.current;
    if (!box) return;
    if (anchor.current) {
      box.scrollTop =
        anchor.current.top + box.scrollHeight - anchor.current.height;
      anchor.current = null;
    } else if (bottom.current) {
      box.scrollTop = box.scrollHeight;
      if (newest) onRead(newest.seq);
    } else if (latest.current && newest && newest.seq > latest.current.seq)
      setNewMessages(true);
    latest.current = newest;
  }, [messages, newest, onRead]);
  useEffect(() => {
    const visible = () => {
      if (bottom.current && newest) onRead(newest.seq);
    };
    document.addEventListener("visibilitychange", visible);
    return () => document.removeEventListener("visibilitychange", visible);
  }, [newest, onRead]);
  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scroll}
        aria-label="Message history"
        className="h-full overflow-y-auto overscroll-contain p-4 sm:p-6"
        onScroll={() => {
          const box = scroll.current!;
          bottom.current =
            box.scrollHeight - box.scrollTop - box.clientHeight < 60;
          if (bottom.current) {
            setNewMessages(false);
            if (newest) onRead(newest.seq);
          }
        }}
      >
        {before && (
          <div className="mb-5 text-center">
            <Button
              size="sm"
              variant="outline"
              disabled={older}
              onClick={async () => {
                if (older) return;
                setOlder(true);
                setError("");
                bottom.current = false;
                try {
                  await loadOlder(() => {
                    const box = scroll.current!;
                    anchor.current = {
                      height: box.scrollHeight,
                      top: box.scrollTop,
                    };
                  });
                } catch {
                  anchor.current = null;
                  setError("Older messages could not be loaded. Please retry.");
                } finally {
                  setOlder(false);
                }
              }}
            >
              {older ? "Loading…" : "Load older messages"}
            </Button>
          </div>
        )}
        {error && <ChatNotice>{error}</ChatNotice>}
        {!messages.length && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Start the conversation. Ask about services or an upcoming visit.
          </p>
        )}
        {messages.map((message, index) => {
          const own = message.sender_id === userId;
          const date = new Date(message.created_at);
          const day = date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const previousDay = index
            ? new Date(messages[index - 1].created_at).toLocaleDateString(
                undefined,
                { month: "short", day: "numeric", year: "numeric" },
              )
            : "";
          const age = now - date.getTime();
          return (
            <div key={message.id}>
              {day !== previousDay && (
                <p className="my-5 text-center text-xs text-muted-foreground">
                  {day}
                </p>
              )}
              <div
                className={`mb-4 flex items-start gap-1 ${own ? "justify-end" : "justify-start"}`}
              >
                {own && !message.deleted_at && age < 86400000 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Message options"
                          className="size-8 shrink-0"
                        />
                      }
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {age < 900000 && (
                        <DropdownMenuItem onClick={() => onEdit(message)}>
                          <Pencil className="size-4" />
                          Edit message
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onDelete(message)}>
                        <Trash2 className="size-4" />
                        Delete message
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <div className="max-w-[85%] sm:max-w-[75%]">
                  <div
                    className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm [overflow-wrap:anywhere] ${own ? "rounded-tr-sm bg-[#3c6355] text-white" : "rounded-tl-sm bg-[#f1f4f2] text-[#242524]"} ${message.deleted_at ? "italic opacity-70" : ""}`}
                  >
                    {message.deleted_at ? "Message deleted" : message.body}
                  </div>
                  <p
                    className={`mt-1 text-[11px] text-muted-foreground ${own ? "text-right" : ""}`}
                  >
                    <span className="sr-only">
                      {own ? "You" : "Received"},{" "}
                    </span>
                    <time
                      dateTime={message.created_at}
                      title={date.toLocaleString()}
                    >
                      {date.toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </time>
                    {message.edited_at && !message.deleted_at
                      ? " · Edited"
                      : ""}
                    {own && !message.deleted_at
                      ? message.seq <= recipientRead
                        ? " · Read"
                        : " · Sent"
                      : ""}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        {footer}
      </div>
      {newMessages && (
        <Button
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[#3c6355] text-white shadow-sm"
          size="sm"
          onClick={() => {
            bottom.current = true;
            scroll.current!.scrollTop = scroll.current!.scrollHeight;
            setNewMessages(false);
            if (newest) onRead(newest.seq);
          }}
        >
          New messages <ChevronDown className="size-4" />
        </Button>
      )}
    </div>
  );
}
