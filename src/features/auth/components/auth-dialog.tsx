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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: AuthDialogMode;
}) {
  const [mode, setMode] = useState<AuthDialogMode>(initialMode);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setMode(initialMode);
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogClose onClick={() => onOpenChange(false)} />
        <DialogHeader>
          <AspenLogo size={56} className="size-14" />
        </DialogHeader>
        <AuthForm
          mode={mode}
          onForgotPassword={() => setMode("forgot")}
          onCreateAccount={() => setMode("signup")}
          onSignIn={() => setMode("login")}
        />
      </DialogContent>
    </Dialog>
  );
}
