export type ChatRole = "customer" | "provider";
export type Conversation = {
  id: string;
  business_id: string;
  business_slug: string;
  name: string;
  photo_id: string | null;
  preview: string;
  last_activity_at: string;
  unread_count: number;
  muted: boolean;
  archived: boolean;
  participant_role: ChatRole;
};
export type Message = {
  id: string;
  seq: number;
  conversation_id: string;
  sender_id: string;
  client_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};
export type InboxPage = {
  items: Conversation[];
  next: { at: string; id: string } | null;
};
export type HistoryPage = {
  messages: Message[];
  before: number | null;
  watermark: string;
  recipientRead: number;
};
export type SyncPage = {
  messages: Message[];
  more: boolean;
  cursor: { at: string; seq: number };
  recipientRead: number;
};
