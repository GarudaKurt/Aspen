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

export type ServiceAnalytics = {
  views: number;
  favorites: number;
  inquiries: number;
  bookings: number;
};

export type {
  BusinessService as ServiceItem,
  BusinessServiceStatus as ServiceStatus,
} from "@/domain/business";
