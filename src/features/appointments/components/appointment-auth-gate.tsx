"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthDialog } from "@/features/auth/components/auth-dialog";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

type AppointmentAuthGateProps = {
  businessSlug?: string;
};

function getAppointmentPath(businessSlug?: string) {
  return businessSlug
    ? `/business-profile/${businessSlug}/request-appointment`
    : "/request-appointment";
}

export function AppointmentAuthGate({ businessSlug }: AppointmentAuthGateProps) {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const destination = getAppointmentPath(businessSlug);

  const handleRequestAppointment = async () => {
    if (checking) return;

    setChecking(true);
    try {
      const { data, error } = await getSupabaseBrowserClient().auth.getUser();
      if (!error && data.user) {
        router.push(destination);
        return;
      }

      setAuthOpen(true);
    } catch {
      setAuthOpen(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleRequestAppointment()}
        disabled={checking}
        className="mt-5 inline-flex h-9 w-full items-center justify-center rounded-md bg-[#3c6355] px-2 text-xs font-semibold text-white transition-colors hover:bg-[#2f5044] disabled:cursor-wait disabled:opacity-70"
      >
        {checking ? "Checking account…" : "Request Appointment"}
      </button>
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        initialMode="login"
        redirectPath={destination}
        onSubmitSuccess={() => {
          setAuthOpen(false);
          router.push(destination);
        }}
      />
    </>
  );
}
