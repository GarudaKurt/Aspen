"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import type { CalendarData } from "./types";

export function useCalendar(businessId: string, start: string, end: string) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ key: string; data: CalendarData | null; loading: boolean; error: string }>({ key: "", data: null, loading: true, error: "" });
  const [live, setLive] = useState(false);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const key = `${businessId}:${start}:${end}`;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ businessId, start, end });
    // Refreshes preserve the current range; date navigation never shows stale events.
    void (async () => {
      try {
        const response = await fetch(`/api/tenant-calendar?${params}`, { signal: controller.signal, cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load your calendar.");
        if (!controller.signal.aborted) setState({ key, data: payload, loading: false, error: "" });
      } catch (error) {
        if (!controller.signal.aborted) setState((previous) => ({ key, data: previous.key === key ? previous.data : null, loading: false, error: error instanceof Error ? error.message : "Unable to load your calendar." }));
      }
    })();
    return () => controller.abort();
  }, [businessId, start, end, key, revision]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let active = true;
    let debounce: ReturnType<typeof setTimeout>;
    const changed = () => { if (active) { clearTimeout(debounce); debounce = setTimeout(refresh, 350); } };
    const channel = supabase.channel(`calendar:${businessId}:${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `business_uuid=eq.${businessId}` }, changed)
      .on("postgres_changes", { event: "*", schema: "public", table: "business_calendar_events", filter: `business_id=eq.${businessId}` }, changed)
      .subscribe((status) => { if (active) { setLive(status === "SUBSCRIBED"); if (status === "SUBSCRIBED") changed(); } });
    const onFocus = () => { if (document.visibilityState === "visible") refresh(); };
    // Reconcile missed/disconnected messages and hard deletions (which cannot be filtered).
    const poll = setInterval(onFocus, 30_000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      active = false;
      clearTimeout(debounce); clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [businessId, refresh]);

  return { data: state.key === key ? state.data : null, loading: state.key !== key || state.loading, error: state.key === key ? state.error : "", live, refresh };
}
