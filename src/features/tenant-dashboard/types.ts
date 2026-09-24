export type DashboardNavItem = {
  label: string;
  href: string;
  icon: string;
  group: "main" | "content" | "business";
};

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

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  type: "booking" | "meeting" | "availability";
  customer: string;
};

export type ServiceItem = {
  id: string;
  title: string;
  price: string;
  duration: string;
  status: "Active" | "Draft" | "Paused";
};
