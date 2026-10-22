"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CheckCircle2, LockKeyhole, Save, ShieldCheck } from "lucide-react";

import { UserAvatar, type HeaderUser } from "@/components/landing/user-account-menu";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export function CustomerProfilePage({ user }: { user: HeaderUser }) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [saving, setSaving] = useState(false);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextName = displayName.trim();
    if (!nextName) return;

    setSaving(true);
    const { error } = await getSupabaseBrowserClient()
      .from("profiles")
      .update({ display_name: nextName })
      .eq("id", user.id);
    setSaving(false);

    if (error) {
      toast({
        title: "Could not update your profile",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Profile updated",
      description: "Your display name has been saved.",
      variant: "success",
    });
  };

  return (
    <main className="min-h-screen bg-[#fafcfb] text-[#171817]">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c5714e]">Your Aspen account</p>
          <h1 className="mt-2 text-3xl font-bold text-[#3c6355] sm:text-4xl">My Profile</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#777b78] sm:text-base">
            Manage the details you use when booking trusted pet services.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <Card className="p-6">
            <div className="flex flex-col items-center text-center">
              <UserAvatar user={user} size="large" />
              <h2 className="mt-4 text-xl font-semibold text-[#242524]">{user.displayName}</h2>
              <p className="mt-1 break-all text-sm text-[#777b78]">{user.email}</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#eef7f1] px-3 py-1.5 text-xs font-semibold text-[#3c6355]">
                <CheckCircle2 size={14} aria-hidden="true" />
                Email verified
              </div>
            </div>
          </Card>

          <div className="space-y-5">
            <Card className="p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 text-[#3c6355]" aria-hidden="true" />
                <div>
                  <h2 className="font-semibold text-[#242524]">Personal information</h2>
                  <p className="mt-1 text-sm text-[#777b78]">Keep your name up to date for bookings and messages.</p>
                </div>
              </div>
              <form onSubmit={saveProfile} className="mt-5 space-y-4">
                <div>
                  <Label htmlFor="profile-display-name">Display name</Label>
                  <Input
                    id="profile-display-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="mt-2"
                    maxLength={80}
                  />
                </div>
                <div>
                  <Label htmlFor="profile-email">Email address</Label>
                  <Input id="profile-email" value={user.email} readOnly className="mt-2 bg-[#f6f8f6]" />
                </div>
                <Button type="submit" disabled={saving || !displayName.trim()} className="gap-2 bg-[#3c6355] text-white hover:bg-[#2f5044]">
                  <Save size={16} aria-hidden="true" />
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </form>
            </Card>

            <Card id="settings" className="p-6">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 size-5 text-[#3c6355]" aria-hidden="true" />
                <div>
                  <h2 className="font-semibold text-[#242524]">Account settings</h2>
                  <p className="mt-1 text-sm leading-6 text-[#777b78]">
                    Update your password using Aspen&apos;s secure Supabase recovery flow.
                  </p>
                </div>
              </div>
              <Link
                href="/forgot-password"
                className={buttonVariants({
                  variant: "outline",
                  className: "mt-5 border-[#3c6355] text-[#3c6355] hover:bg-[#eef7f1]",
                })}
              >
                Change password
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
