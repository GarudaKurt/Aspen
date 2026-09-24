"use client";

import * as React from "react";
import { cn } from "cn";

type SidebarContextValue = { open: boolean; setOpen: (open: boolean) => void };
const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true);
  return <SidebarContext.Provider value={{ open, setOpen }}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within SidebarProvider");
  return context;
}

export function Sidebar({ children, className }: React.HTMLAttributes<HTMLElement>) {
  const { open } = useSidebar();
  return <aside className={cn("shrink-0 border-r bg-white transition-[width] duration-200", open ? "w-64" : "w-0 overflow-hidden border-r-0", className)}>{children}</aside>;
}

export function SidebarTrigger({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = useSidebar();
  return <button type="button" aria-label={open ? "Collapse menu" : "Expand menu"} onClick={() => setOpen(!open)} className={cn("rounded-md p-2 text-slate-500 hover:bg-slate-100", className)} {...props}>{open ? "‹" : "›"}</button>;
}

export function SidebarContent({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("h-full overflow-y-auto", className)}>{children}</div>;
}
