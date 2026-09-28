"use client";

import { useState } from "react";

import { CreateAccountDialog } from "./create-account-dialog";

export function SignupPage() {
  const [open, setOpen] = useState(true);

  return <CreateAccountDialog open={open} onOpenChange={setOpen} />;
}
