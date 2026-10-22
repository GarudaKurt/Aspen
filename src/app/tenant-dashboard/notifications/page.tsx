import { MobileDashboardNav } from "@/features/tenant-dashboard/components/dashboard-shell";
import { NotificationCenter, type AppNotification } from "@/features/notifications";

const notifications: AppNotification[] = [
  {
    id: "n1",
    kind: "Bookings",
    title: "New booking request from Juan Dela Cruz",
    detail: "Full Grooming Package · Sat, Sep 20 · 2:00 PM",
    timestamp: "10:20 AM",
  },
  {
    id: "n2",
    kind: "Reviews",
    title: "Maria Santos left a 5-star review",
    detail: '"Bella looks amazing, thank you!"',
    timestamp: "Yesterday",
  },
  {
    id: "n3",
    kind: "Payments",
    title: "Payment received — ₱650",
    detail: "Overnight Boarding · Maria Santos",
    timestamp: "Yesterday",
  },
];

export default function TenantNotificationsPage() {
  return <NotificationCenter audience="provider" notifications={notifications} navigation={<MobileDashboardNav />} />;
}
