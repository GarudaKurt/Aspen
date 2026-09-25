"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AlertDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
      <button type="button" aria-label="Close confirmation" className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="relative z-10 w-full max-w-md rounded-xl border bg-white p-6 shadow-2xl">
        <button type="button" aria-label="Close confirmation" className="absolute right-4 top-4 text-slate-500 hover:text-slate-900" onClick={() => onOpenChange(false)}>
          <X className="size-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function AlertDialogHeader({ children }: { children: ReactNode }) {
  return <div className="space-y-2 pr-6">{children}</div>;
}

export function AlertDialogTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-semibold">{children}</h2>;
}

export function AlertDialogDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

export function AlertDialogFooter({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex justify-end gap-2">{children}</div>;
}

export function AlertDialogCancel({
  children = "Cancel",
  onClick,
}: {
  children?: ReactNode;
  onClick?: () => void;
}) {
  return <Button type="button" variant="outline" onClick={onClick}>{children}</Button>;
}

export function AlertDialogAction({
  children = "Continue",
  onClick,
}: {
  children?: ReactNode;
  onClick?: () => void;
}) {
  return <Button type="button" variant="destructive" onClick={onClick}>{children}</Button>;
}
