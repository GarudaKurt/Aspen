"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chatQuery } from "./api/queries";
import { subscribeToChat } from "./api/realtime";
import { chatAction } from "./api/actions";
import { mergeMessages } from "./model";
import { toast } from "@/components/ui/toast";
import type {
  ChatRole,
  HistoryPage,
  InboxPage,
  Message,
  SyncPage,
} from "./types";

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "Could not connect. Please retry.";

/** Debounce bursts, recover after reconnect/visibility changes, and poll as fallback. */
function useChatSubscription(
  userId: string,
  conversation: string | null,
  refresh: () => void,
) {
  const [live, setLive] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (document.visibilityState === "visible") refresh();
      }, 180);
    };
    const stop = subscribeToChat(userId, conversation, update, setLive);
    const poll = setInterval(update, 15000);
    window.addEventListener("online", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      stop();
      clearInterval(poll);
      clearTimeout(timer);
      window.removeEventListener("online", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [userId, conversation, refresh]);
  return live;
}

export function useInbox(userId: string, role: ChatRole, archived: boolean) {
  const [page, setPage] = useState<InboxPage>({ items: [], next: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const loadedCount = useRef(30);
  const known = useRef(new Map<string, number>());
  const initialized = useRef(false);
  const load = useCallback(
    async (cursor?: InboxPage["next"]) => {
      controller.current?.abort();
      const request = new AbortController();
      controller.current = request;
      try {
        let result = await chatQuery<InboxPage>(
          {
            op: "inbox",
            role,
            archived: String(archived),
            at: cursor?.at,
            id: cursor?.id,
          },
          request.signal,
        );
        // Keep already-opened inbox pages synchronized, including archive/mute changes
        // made in another tab. Do not collapse the list during a background refresh.
        if (!cursor) {
          const all = [...result.items];
          while (result.next && all.length < loadedCount.current) {
            result = await chatQuery<InboxPage>(
              {
                op: "inbox",
                role,
                archived: String(archived),
                at: result.next.at,
                id: result.next.id,
              },
              request.signal,
            );
            all.push(...result.items);
          }
          result = {
            ...result,
            items: [...new Map(all.map((item) => [item.id, item])).values()],
          };
        }
        if (request.signal.aborted) return;
        if (!cursor && initialized.current && !archived) {
          const incoming = result.items.find(
            (item) =>
              !item.muted &&
              item.unread_count > (known.current.get(item.id) ?? 0),
          );
          if (incoming)
            toast({
              title: `New message from ${incoming.name}`,
              description: "Open the conversation to read it.",
            });
        }
        for (const item of result.items)
          known.current.set(item.id, item.unread_count);
        initialized.current = true;
        if (cursor) loadedCount.current += result.items.length;
        setPage((prior) => ({
          ...result,
          items: cursor
            ? [
                ...new Map(
                  [...prior.items, ...result.items].map((item) => [
                    item.id,
                    item,
                  ]),
                ).values(),
              ]
            : result.items,
        }));
        setError("");
      } catch (failure) {
        if (!request.signal.aborted) setError(errorText(failure));
      } finally {
        if (!request.signal.aborted) setLoading(false);
      }
    },
    [role, archived],
  );
  useEffect(() => {
    loadedCount.current = 30;
    known.current.clear();
    initialized.current = false;
    const timer = setTimeout(() => {
      setPage({ items: [], next: null });
      setLoading(true);
      void load();
    }, 0);
    return () => {
      clearTimeout(timer);
      controller.current?.abort();
    };
  }, [load]);
  const refresh = useCallback(() => {
    void load();
  }, [load]);
  const live = useChatSubscription(userId, null, refresh);
  return {
    ...page,
    loading,
    error,
    live,
    refresh,
    loadMore: () => load(page.next),
  };
}

export function useMessages(userId: string, conversation: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [before, setBefore] = useState<number | null>(null);
  const [recipientRead, setRecipientRead] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const cursor = useRef<{ at: string; seq: number } | null>(null);
  const syncing = useRef(false);
  const mounted = useRef(false);
  const readPosition = useRef(0);
  const requests = useRef(new Set<AbortController>());
  const query = useCallback(
    async <T>(params: Record<string, string | number | undefined>) => {
      const controller = new AbortController();
      requests.current.add(controller);
      try {
        return await chatQuery<T>(params, controller.signal);
      } finally {
        requests.current.delete(controller);
      }
    },
    [],
  );
  const initialize = useCallback(async () => {
    try {
      const page = await query<HistoryPage>({ op: "history", conversation });
      if (!mounted.current) return;
      setMessages((prior) => mergeMessages(prior, page.messages, true));
      setBefore(page.before);
      setRecipientRead(page.recipientRead);
      cursor.current = { at: page.watermark, seq: 0 };
      setError("");
    } catch (failure) {
      if (mounted.current) setError(errorText(failure));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [conversation, query]);
  const sync = useCallback(async () => {
    if (syncing.current || !mounted.current) return;
    syncing.current = true;
    try {
      if (!cursor.current) {
        await initialize();
        return;
      }
      // Bounded batches; any remaining backlog is recovered on the next poll.
      for (let batch = 0; batch < 5 && mounted.current; batch++) {
        const page: SyncPage = await query<SyncPage>({
          op: "sync",
          conversation,
          ...cursor.current,
        });
        if (!mounted.current) return;
        setMessages((prior) => mergeMessages(prior, page.messages));
        setRecipientRead(page.recipientRead);
        cursor.current = page.cursor;
        setError("");
        if (!page.more) break;
      }
    } catch (failure) {
      if (mounted.current) setError(errorText(failure));
    } finally {
      syncing.current = false;
    }
  }, [conversation, initialize, query]);
  useEffect(() => {
    mounted.current = true;
    const initial = setTimeout(() => void sync(), 0);
    const pending = requests.current;
    return () => {
      mounted.current = false;
      clearTimeout(initial);
      for (const request of pending) request.abort();
    };
  }, [sync]);
  const refresh = useCallback(() => {
    void sync();
  }, [sync]);
  const live = useChatSubscription(userId, conversation, refresh);
  const loadOlder = async (beforeInsert?: () => void) => {
    if (!before) return;
    const page = await query<HistoryPage>({
      op: "history",
      conversation,
      before,
    });
    if (!mounted.current) return;
    beforeInsert?.();
    setMessages((prior) => mergeMessages(prior, page.messages, true));
    setBefore(page.before);
  };
  const read = useCallback(
    async (seq: number) => {
      if (seq <= readPosition.current || document.visibilityState !== "visible")
        return;
      const previous = readPosition.current;
      readPosition.current = seq;
      try {
        const result = await chatAction({ action: "read", conversation, seq });
        if (!result.ok) {
          readPosition.current = previous;
          if (mounted.current) setError(result.error);
        }
      } catch {
        readPosition.current = previous;
      }
    },
    [conversation],
  );
  return {
    messages,
    before,
    recipientRead,
    loading,
    error,
    live,
    refresh,
    loadOlder,
    read,
    accept: (message: Message) =>
      setMessages((prior) => mergeMessages(prior, [message], true)),
  };
}
