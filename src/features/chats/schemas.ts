import { z } from "zod";

const id = z.string().uuid();
const body = z
  .string()
  .trim()
  .min(1, "Write a message first.")
  .max(4000, "Messages can contain up to 4,000 characters.");
const timestamp = z.string().datetime({ offset: true });
export const chatMessageSchema = z.object({
  id,
  seq: z.number().int().safe().positive(),
  conversation_id: id,
  sender_id: id,
  client_id: id,
  body: z.string().max(4000),
  created_at: timestamp,
  updated_at: timestamp,
  edited_at: timestamp.nullable(),
  deleted_at: timestamp.nullable(),
});
export const chatCommandSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start"),
    slug: z.string().trim().min(1).max(160),
  }),
  z.object({ action: z.literal("send"), conversation: id, clientId: id, body }),
  z.object({
    action: z.literal("edit"),
    message: id,
    body,
    version: timestamp,
  }),
  z.object({ action: z.literal("delete"), message: id, version: timestamp }),
  z.object({
    action: z.literal("read"),
    conversation: id,
    seq: z.number().int().safe().nonnegative(),
  }),
  z.object({
    action: z.literal("preferences"),
    conversation: id,
    archived: z.boolean().optional(),
    muted: z.boolean().optional(),
    hidden: z.boolean().optional(),
  }),
]);
export type ChatCommand = z.infer<typeof chatCommandSchema>;
export const chatQuerySchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("inbox"),
    role: z.enum(["customer", "provider"]),
    archived: z.enum(["true", "false"]).default("false"),
    at: timestamp.optional(),
    id: id.optional(),
  }),
  z.object({
    op: z.literal("detail"),
    role: z.enum(["customer", "provider"]),
    conversation: id,
  }),
  z.object({
    op: z.literal("history"),
    conversation: id,
    before: z.coerce.number().int().safe().positive().optional(),
  }),
  z.object({
    op: z.literal("sync"),
    conversation: id,
    at: timestamp,
    seq: z.coerce.number().int().safe().nonnegative(),
  }),
]);
