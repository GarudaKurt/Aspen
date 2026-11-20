"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "@/features/auth/components/auth-dialog";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export function BusinessMessageButton({
  slug,
  preview,
}: {
  slug?: string;
  preview: boolean;
}) {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const destination = `/chats?business=${encodeURIComponent(slug ?? "")}`;
  return (
    <>
      <Button
        type="button"
        disabled={preview || !slug || checking}
        title={
          preview
            ? "Messaging is available on the published business profile"
            : undefined
        }
        className="h-9 rounded-full bg-[#3c6355] px-3 text-xs text-white hover:bg-[#2f5044]"
        onClick={async () => {
          if (checking) return;
          setChecking(true);
          try {
            const { data } = await getSupabaseBrowserClient().auth.getUser();
            if (data.user?.email_confirmed_at) router.push(destination);
            else setAuthOpen(true);
          } catch {
            setAuthOpen(true);
          } finally {
            setChecking(false);
          }
        }}
      >
        <MessageCircle size={14} />
        {checking ? "Opening…" : "Message"}
      </Button>
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
