import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { services } from "@/features/tenant-dashboard/mock-data";
import { MobileDashboardNav } from "@/features/tenant-dashboard/components/dashboard-shell";

export default function TenantServicesPage() {
  return <><MobileDashboardNav /><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold">Services</h1><p className="mt-1 text-slate-500">Manage what you offer and how it appears to customers.</p></div><Button className="bg-[#3c6355] text-white hover:bg-[#2f5044]">+ Create Service</Button></div><div className="mt-7 grid gap-4 md:grid-cols-2">{services.map((service) => <Card key={service.id} className="p-5 shadow-none"><div className="flex items-start justify-between gap-3"><h2 className="text-lg font-semibold">{service.title}</h2><span className={`rounded-full px-3 py-1 text-xs font-semibold ${service.status === "Active" ? "bg-emerald-50 text-emerald-600" : service.status === "Draft" ? "bg-sky-50 text-sky-600" : "bg-orange-50 text-orange-600"}`}>{service.status}</span></div><div className="mt-6 flex items-center justify-between border-t pt-4"><strong>{service.price}</strong><span className="text-sm text-slate-400">{service.duration} · edited 2d ago</span></div></Card>)}</div></>;
}
