"use client";

import { AuthDialog } from "./auth-dialog";

export function CreateAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <AuthDialog
      open={open}
      onOpenChange={onOpenChange}
      initialMode="signup"
    />
  );
}
