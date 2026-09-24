"use client";

import * as React from "react";
import { cn } from "cn";

type SidebarContextValue = { open: boolean; setOpen: (open: boolean) => void };
const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true);

  React.useEffect(() => {
    const syncToViewport = () => setOpen(window.innerWidth >= 1024);
    syncToViewport();
    window.addEventListener("resize", syncToViewport);
    return () => window.removeEventListener("resize", syncToViewport);
  }, []);

  return <SidebarContext.Provider value={{ open, setOpen }}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within SidebarProvider");
  return context;
}

export function Sidebar({ children, className }: React.HTMLAttributes<HTMLElement>) {
  const { open } = useSidebar();
  return <aside
    data-state={open ? "expanded" : "collapsed"}
    className={cn(
      "fixed inset-y-0 left-0 z-50 w-64 border-r bg-white transition-[width,transform] duration-200 lg:static lg:z-auto lg:min-h-[calc(100vh-5rem)]",
      open ? "translate-x-0" : "-translate-x-full lg:w-16 lg:translate-x-0",
      className,
    )}
  >{children}</aside>;
}

export function SidebarTrigger({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = useSidebar();
  return <button type="button" aria-label={open ? "Collapse menu" : "Expand menu"} aria-expanded={open} onClick={() => setOpen(!open)} className={cn("rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3c6355]", className)} {...props}>{open ? "‹" : "›"}</button>;
}

export function SidebarContent({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("h-full overflow-y-auto", className)}>{children}</div>;
}
