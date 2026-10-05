export type Conversation = {
  id: string;
  name: string;
  initials: string;
  preview: string;
  timestamp: string;
  online?: boolean;
  unreadCount?: number;
  muted?: boolean;
  messages: Message[];
};

export type Message = {
  id: string;
  body: string;
  timestamp: string;
  from: "customer" | "provider";
  edited?: boolean;
  deleted?: boolean;
};

