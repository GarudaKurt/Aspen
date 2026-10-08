"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ServicePhotoCarousel } from "./service-photo-carousel";
import type { ServiceItem } from "../types";

export function ServicePreviewSheet({
  service,
  onClose,
}: {
  service: ServiceItem | null;
  onClose: () => void;
}) {
  if (!service) return null;

  return (
    <Card className="mt-6 overflow-hidden bg-white p-0 shadow-none">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3c6355]">Customer preview</p>
          <h2 className="mt-1 text-xl font-semibold">{service.title}</h2>
        </div>
        <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
      </div>
          <div className="p-5 sm:p-6">
            <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
              <ServicePhotoCarousel
                photos={service.photos}
                title={service.title}
              />
              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-[#3c6355]">{service.category}</p>
                    <h3 className="text-xl font-semibold">{service.title}</h3>
                  </div>
                  <span className="font-semibold text-[#3c6355]">
                    {service.price}
                  </span>
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  {service.description}
                </p>
                <div className="flex items-center justify-between border-t pt-3 text-sm text-slate-500">
                  <span>{service.duration}</span>
                  <span>
                    {service.status === "Active"
                      ? "Available to book"
                      : "Currently unavailable"}
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-slate-400">
              This is how customers will see this service.
            </p>
          </div>
          <div className="border-t p-5 sm:p-6">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={onClose}
            >
              Close preview
            </Button>
          </div>
    </Card>
  );
}
