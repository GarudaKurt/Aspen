"use client";

import { useRouter } from "next/navigation";
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
  const [open, setOpen] = useState(true);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) router.replace("/");
  };

  return (
    <AuthDialog
      open={open}
      onOpenChange={handleOpenChange}
      initialMode={initialMode}
    />
  );
}
