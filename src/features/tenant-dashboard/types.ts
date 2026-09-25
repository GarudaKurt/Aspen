export type DashboardNavItem = {
  label: string;
  href: string;
  icon: string;
  group: "main" | "content" | "business";
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  type: "booking" | "meeting" | "availability";
  customer: string;
};

export type ServiceStatus = "Active" | "Draft" | "Paused";

export type ServiceItem = {
  id: string;
  title: string;
  category: string;
  description: string;
  price: string;
  duration: string;
  photos: string[];
  status: ServiceStatus;
};
