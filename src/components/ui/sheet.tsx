"use client";

import { type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Sheet({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
    <button type="button" aria-label="Close panel" className="absolute inset-0 bg-black/30" onClick={() => onOpenChange(false)} />
    {children}
  </div>;
}

export function SheetContent({
  children,
  onClose,
  title,
  className,
  headerActions,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
  className?: string;
  headerActions?: ReactNode;
}) {
  return <aside className={`absolute inset-y-0 right-0 flex w-full max-w-lg flex-col overflow-y-auto border-l bg-white shadow-2xl transition-[max-width] duration-200 ${className ?? ""}`}>
    <div className="flex items-center justify-between border-b p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex items-center gap-1">
        {headerActions}
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close panel"><X /></Button>
      </div>
    </div>
    {children}
  </aside>;
}

export function SheetFooter({ children }: { children: ReactNode }) {
  return <div className="mt-auto flex justify-end gap-2 border-t bg-white p-5">{children}</div>;
}
