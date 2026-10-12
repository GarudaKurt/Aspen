"use client";

import { useRouter } from "next/navigation";
import { useProviderAuthStore, mockProviderCredentials } from "../provider-auth.store";
import { AuthForm } from "@/features/auth/components/auth-form";
import { AspenLogo } from "@/components/brand/aspen-logo";

export function ProviderLoginPage() {
  const router = useRouter();
  const login = useProviderAuthStore((state) => state.login);

  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8 text-[#171817] sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <AspenLogo size={52} className="size-[52px]" />
        </div>

        <section className="rounded-2xl border border-[#dfe8e2] bg-white p-5 shadow-sm sm:p-8">
          <h1 className="text-3xl font-bold">Let&apos;s sign you in.</h1>
          <p className="mt-2 text-sm text-[#69736d]">Welcome back.</p>
          <p className="mt-6 rounded-lg bg-[#eef7f1] p-3 text-xs leading-5 text-[#587267]">
            Sign in to manage your business, services, appointments, and provider
            settings.
          </p>
          <AuthForm
            mode="login"
            onSubmitSuccess={async ({ email, password }) => {
              if (
                email.trim().toLowerCase() !== mockProviderCredentials.email ||
                password !== mockProviderCredentials.password
              ) {
                return false;
              }
              login();
              const nextPath =
                typeof window !== "undefined"
                  ? new URLSearchParams(window.location.search).get("next")
                  : null;
              router.replace(nextPath || "/tenant-dashboard");
              return true;
            }}
          />
          <p className="mt-5 text-center text-xs leading-5 text-[#8a948e]">
            Mock UI credentials: {mockProviderCredentials.email} /{" "}
            {mockProviderCredentials.password}
          </p>
        </section>
      </div>
    </main>
  );
}
