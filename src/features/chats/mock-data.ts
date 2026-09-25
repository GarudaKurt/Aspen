import type { Conversation } from "./types";

export const conversations: Conversation[] = [
  { id: "juan", name: "Juan Dela Cruz", initials: "JD", preview: "Is 2pm available today?", timestamp: "10:12 PM", online: true, unreadCount: 2, messages: [
    { id: "m1", body: "Is 2pm available today?", timestamp: "10:12 PM", from: "customer" },
    { id: "m2", body: "Yes, I can fit you in at 2pm.", timestamp: "10:15 PM", from: "provider" },
  ]},
  { id: "kurt", name: "Kurt Tyler", initials: "KT", preview: "Thank you so much...", timestamp: "Yesterday", unreadCount: 0, muted: false, messages: [
    { id: "m3", body: "Thank you so much for the update.", timestamp: "Yesterday", from: "customer" },
  ]},
];

