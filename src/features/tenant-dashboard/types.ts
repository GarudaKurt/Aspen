export type DashboardNavItem = {
  label: string;
  href: string;
  icon: string;
  group: "overview" | "business" | "inbox" | "account";
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
