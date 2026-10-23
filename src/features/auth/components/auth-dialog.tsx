"use client";

import { useState } from "react";

import { AspenLogo } from "@/components/brand/aspen-logo";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";

import { AuthForm } from "./auth-form";

export type AuthDialogMode = "login" | "signup" | "forgot" | "reset";

export function AuthDialog({
  open,
  onOpenChange,
  initialMode = "login",
  onSubmitSuccess,
  notice,
  redirectPath,
  compact = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: AuthDialogMode;
  onSubmitSuccess?: () => boolean | Promise<boolean> | void;
  notice?: { message: string; variant: "error" | "success" };
  redirectPath?: string;
  compact?: boolean;
}) {
  const [mode, setMode] = useState<AuthDialogMode>(initialMode);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setMode(initialMode);
    onOpenChange(nextOpen);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      className={compact ? "!overflow-hidden" : undefined}
    >
      <DialogContent
        className={
          compact
            ? "!max-h-[calc(100dvh-2rem)] !max-w-md !overflow-hidden !p-5 sm:!max-h-[calc(100dvh-3rem)] sm:!p-6"
            : undefined
        }
      >
        <DialogClose onClick={() => onOpenChange(false)} />
        <DialogHeader className={compact ? "mb-1" : undefined}>
          <AspenLogo size={compact ? 40 : 56} className={compact ? "size-10" : "size-14"} />
        </DialogHeader>
        <AuthForm
          mode={mode}
          onForgotPassword={() => setMode("forgot")}
          onCreateAccount={() => setMode("signup")}
          onSignIn={() => setMode("login")}
          onSubmitSuccess={onSubmitSuccess}
          notice={notice}
          redirectPath={redirectPath}
        />
      </DialogContent>
    </Dialog>
  );
}
