"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import {
  AuthDialog,
  type AuthDialogMode,
} from "./auth-dialog";

export function AuthRoutePage({
  initialMode,
}: {
  initialMode: AuthDialogMode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(true);
  const nextPath = searchParams.get("next");
  const notice = (() => {
    if (searchParams.get("verified") === "1") {
      return {
        message: "Your email has been verified. You can now sign in.",
        variant: "success" as const,
      };
    }

    const error = searchParams.get("error");
    if (error === "email_not_confirmed") {
      return {
        message: "Please verify your email address before accessing this page.",
        variant: "error" as const,
      };
    }
    if (error === "verification_failed") {
      return {
        message: "This verification link is invalid or expired. Request a new one from signup.",
        variant: "error" as const,
      };
    }

    return undefined;
  })();

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) router.replace("/");
  };

  return (
    <AuthDialog
      open={open}
      onOpenChange={handleOpenChange}
      initialMode={initialMode}
      notice={notice}
      onSubmitSuccess={() => {
        router.replace(nextPath?.startsWith("/") ? nextPath : "/");
      }}
    />
  );
}
