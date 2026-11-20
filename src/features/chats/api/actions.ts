"use server";

import {
  chatCommandSchema,
  chatMessageSchema,
  type ChatCommand,
} from "../schemas";
import { ChatError, chatClient, chatFailure } from "../server";
import type { Message } from "../types";

export async function chatAction(
  input: ChatCommand,
): Promise<
  | { ok: true; conversation?: string; message?: Message }
  | { ok: false; error: string }
> {
  const parsed = chatCommandSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid chat request.",
    };
  try {
    const client = await chatClient();
    const command = parsed.data;
    let result;
    switch (command.action) {
      case "start":
        result = await client.rpc("start_business_chat", {
          p_slug: command.slug,
        });
        break;
      case "send":
        result = await client.rpc("send_chat_message", {
          p_conversation: command.conversation,
          p_client_id: command.clientId,
          p_body: command.body,
        });
        break;
      case "edit":
      case "delete":
        result = await client.rpc("change_chat_message", {
          p_message: command.message,
          p_body: command.action === "edit" ? command.body : null,
          p_delete: command.action === "delete",
          p_updated_at: command.version,
        });
        break;
      case "read":
        result = await client.rpc("read_chat_conversation", {
          p_conversation: command.conversation,
          p_upto_seq: command.seq,
        });
        break;
      case "preferences":
        result = await client.rpc("set_chat_preferences", {
          p_conversation: command.conversation,
          p_archived: command.archived ?? null,
          p_muted: command.muted ?? null,
          p_hidden: command.hidden ?? null,
        });
        break;
    }
    if (result.error) throw result.error;
    if (command.action === "start")
      return { ok: true, conversation: result.data as string };
    if (["send", "edit", "delete"].includes(command.action)) {
      // Composite RPC returns may be represented as a one-row JSON array.
      // Validate the persisted record before acknowledging delivery in the UI.
      const row =
        Array.isArray(result.data) && result.data.length === 1
          ? result.data[0]
          : result.data;
      const message = chatMessageSchema.safeParse(row);
      if (!message.success)
        throw new ChatError(
          "The delivery response was incomplete. Retry this message to confirm it was saved.",
          503,
        );
      return { ok: true, message: message.data };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: chatFailure(error).message };
  }
}
