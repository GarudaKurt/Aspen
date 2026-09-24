import { BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MobileDashboardNav } from "@/features/tenant-dashboard/components/dashboard-shell";

export default function TenantAnalyticsPage() {
  return <><MobileDashboardNav /><h1 className="text-3xl font-bold">Analytics</h1><p className="mt-1 text-slate-500">Track your business performance and customer activity.</p><div className="mt-7 grid gap-4 sm:grid-cols-3">{[["Bookings", "24"], ["Conversion rate", "68%"], ["Revenue", "₱18,400"]].map(([label, value]) => <Card key={label} className="p-5 shadow-none"><BarChart3 className="mb-5 text-[#3c6355]" /><p className="text-sm text-slate-500">{label}</p><strong className="text-2xl">{value}</strong></Card>)}</div></>;
}
