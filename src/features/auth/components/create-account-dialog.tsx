"use client";

import { AspenLogo } from "@/components/brand/aspen-logo";
import { Dialog, DialogClose, DialogContent, DialogHeader } from "@/components/ui/dialog";

import { AuthForm } from "./auth-form";

export function CreateAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose onClick={() => onOpenChange(false)} />
        <DialogHeader>
          <AspenLogo size={56} className="size-14" />
        </DialogHeader>
        <AuthForm mode="signup" />
      </DialogContent>
    </Dialog>
  );
}
