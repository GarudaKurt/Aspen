"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CreateAccountDialog } from "./create-account-dialog";

export function SignupPage() {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) router.replace("/");
  };

  return (
    <CreateAccountDialog open={open} onOpenChange={handleOpenChange} />
  );
}
