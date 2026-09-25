"use client";

import { useSyncExternalStore } from "react";

export type ToastVariant = "default" | "success" | "destructive";

export type ToastItem = {
  id: number;
  title: string;
  description?: string;
  variant?: ToastVariant;
};

let nextId = 0;
let items: ToastItem[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function toast(input: Omit<ToastItem, "id"> | string) {
  const item: ToastItem = typeof input === "string" ? { id: ++nextId, title: input } : { ...input, id: ++nextId };
  items = [...items, item];
  notify();

  window.setTimeout(() => {
    items = items.filter((current) => current.id !== item.id);
    notify();
  }, 4000);

  return item.id;
}

export function dismissToast(id: number) {
  items = items.filter((item) => item.id !== id);
  notify();
}

export function useToastItems() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => items,
    () => [],
  );
}
