"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[#171817]/45 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>
  );
}

export function DialogContent({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "relative z-10 my-auto max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#dfe8e2] bg-white p-5 shadow-2xl outline-none sm:p-8 " +
        className
      }
    >
      {children}
    </div>
  );
}

export function DialogClose({
  onClick,
  label = "Close dialog",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full text-[#69736d] outline-none transition-colors hover:bg-[#eef7f1] hover:text-[#3c6355] focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
    >
      <X className="size-5" />
    </button>
  );
}

export function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="mb-6 flex flex-col items-center">{children}</div>;
}
