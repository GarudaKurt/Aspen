import { NextRequest, NextResponse } from "next/server";
import { chatQuerySchema } from "@/features/chats/schemas";
import { ChatError, chatClient, chatFailure } from "@/features/chats/server";
import type { Conversation, Message } from "@/features/chats/types";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const parsed = chatQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsed.success) throw new ChatError("Invalid chat request.");
    const q = parsed.data;
    const client = await chatClient();
    if (q.op === "inbox" || q.op === "detail") {
      if (q.op === "inbox" && Boolean(q.at) !== Boolean(q.id))
        throw new ChatError("Invalid inbox cursor.");
      const { data, error } = await client.rpc("list_chat_conversations", {
        p_role: q.role,
        p_archived: q.op === "inbox" && q.archived === "true",
        p_limit: q.op === "detail" ? 1 : 31,
        p_before_at: q.op === "inbox" ? (q.at ?? null) : null,
        p_before_id: q.op === "inbox" ? (q.id ?? null) : null,
        p_conversation: q.op === "detail" ? q.conversation : null,
      });
      if (error) throw error;
      const rows = data as Conversation[];
      if (q.op === "detail") {
        if (!rows[0])
          throw new ChatError("Conversation not found or access denied.", 404);
        return NextResponse.json(rows[0], { headers });
      }
      const items = rows.slice(0, 30),
        last = items.at(-1);
      return NextResponse.json(
        {
          items,
          next:
            rows.length > 30 && last
              ? { at: last.last_activity_at, id: last.id }
              : null,
        },
        { headers },
      );
    }
    if (q.op === "history") {
      const { data, error } = await client.rpc("chat_history_page", {
        p_conversation: q.conversation,
        p_before_seq: q.before ?? null,
      });
      if (error) throw error;
      const rows = data.messages as Message[],
        messages = rows.slice(0, 50).reverse();
      return NextResponse.json(
        {
          messages,
          before: rows.length > 50 ? messages[0].seq : null,
          watermark: data.watermark,
          recipientRead: data.recipientRead,
        },
        { headers },
      );
    }
    const { data, error } = await client.rpc("sync_chat_messages", {
      p_conversation: q.conversation,
      p_after_at: q.at,
      p_after_seq: q.seq,
    });
    if (error) throw error;
    const rows = data.messages as Message[],
      messages = rows.slice(0, 100),
      last = messages.at(-1);
    return NextResponse.json(
      {
        messages,
        more: rows.length > 100,
        recipientRead: data.recipientRead,
        cursor: last
          ? { at: last.updated_at, seq: last.seq }
          : { at: q.at, seq: q.seq },
      },
      { headers },
    );
  } catch (error) {
    const failure = chatFailure(error);
    return NextResponse.json(
      { error: failure.message },
      { status: failure.status, headers },
    );
  }
}
