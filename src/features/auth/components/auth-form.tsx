"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { getEmailSuggestion } from "@/shared/schemas/contact.schema";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

import {
  loginSchema,
  recoverySchema,
  resetPasswordSchema,
  signupSchema,
} from "../schemas/auth.schema";

type AuthMode = "login" | "signup" | "forgot" | "reset";
type AuthValues = { email: string; password: string; confirmPassword: string };

function getAuthErrorMessage(error: unknown) {
  const authError = error as { code?: string; message?: string } | null;
  const code = authError?.code;
  const message = authError?.message ?? "";

  if (code === "over_email_send_rate_limit" || /email rate limit exceeded/i.test(message)) {
    return "Email sending is temporarily rate-limited by Supabase. Wait before trying again, or configure a custom SMTP provider for continued testing.";
  }

  if (code === "oauth_provider_not_supported" || /unsupported provider/i.test(message)) {
    return "Google sign-in is not enabled in the Supabase project yet. Enable Google under Authentication → Providers, then try again.";
  }

  if (code === "email_not_confirmed") {
    return "Please confirm your email address before signing in.";
  }

  return error instanceof Error && error.message
    ? error.message
    : "Authentication failed. Please try again.";
}

export function AuthForm({
  mode,
  onForgotPassword,
  onCreateAccount,
  onSignIn,
  onSubmitSuccess,
  notice,
}: {
  mode: AuthMode;
  onForgotPassword?: () => void;
  onCreateAccount?: () => void;
  onSignIn?: () => void;
  onSubmitSuccess?: () => boolean | Promise<boolean> | void;
  notice?: { message: string; variant: "error" | "success" };
}) {
  const [values, setValues] = useState<AuthValues>({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [suggestion, setSuggestion] = useState<{ entered: string; suggested: string } | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendError, setResendError] = useState("");
  const submitInFlight = useRef(false);
  const resendInFlight = useRef(false);
  const isForgotMode = mode === "forgot";

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timeout = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [resendCooldown]);

  const update = (field: keyof AuthValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setSubmitError("");
  };

  const getEmailVerificationRedirect = () =>
    `${window.location.origin}/callback?flow=verification&next=${encodeURIComponent("/login?verified=1")}`;

  const validate = (emailOverride?: string) => {
    const result =
      mode === "login"
        ? loginSchema.safeParse({ email: emailOverride ?? values.email, password: values.password })
        : mode === "signup"
          ? signupSchema.safeParse(values)
          : isForgotMode
            ? recoverySchema.safeParse({ email: emailOverride ?? values.email })
            : resetPasswordSchema.safeParse({
                password: values.password,
                confirmPassword: values.confirmPassword,
              });

    if (result.success) {
      setErrors({});
      return true;
    }

    const nextErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0]?.toString();
      if (field && !nextErrors[field]) nextErrors[field] = issue.message;
    }
    setErrors(nextErrors);
    return false;
  };

  const submitAuth = async (skipEmailSuggestion = false, emailOverride?: string) => {
    if (submitInFlight.current) return;
    if (!validate(emailOverride)) return;

    if (!skipEmailSuggestion && mode !== "reset") {
      const typo = getEmailSuggestion(emailOverride ?? values.email);
      if (typo) {
        setSuggestion(typo);
        return;
      }
    }

    submitInFlight.current = true;
    setLoading(true);
    setSubmitError("");

    try {
      const supabase = getSupabaseBrowserClient();

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email.trim(),
          password: values.password,
        });
        if (error) throw error;

        if (onSubmitSuccess) {
          const accepted = await onSubmitSuccess();
          if (accepted === false) return;
        } else {
          toast({
            title: "Signed in successfully",
            description: rememberMe
              ? "You chose to stay connected on this device."
              : "Your Aspen session is now active.",
            variant: "success",
          });
        }
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: values.email.trim(),
          password: values.password,
          options: {
            emailRedirectTo: getEmailVerificationRedirect(),
          },
        });
        if (error) throw error;

        // Supabase returns a session when email confirmation is disabled and
        // returns no session when the user must confirm their email first.
        if (data.session) {
          if (onSubmitSuccess) {
            const accepted = await onSubmitSuccess();
            if (accepted === false) return;
          } else {
            toast({
              title: "Account created",
              description: "Your Aspen session is now active.",
              variant: "success",
            });
          }
          return;
        }

        setShowConfirmation(true);
        return;
      }

      if (isForgotMode) {
        const { error } = await supabase.auth.resetPasswordForEmail(values.email.trim(), {
          redirectTo: `${window.location.origin}/callback?next=/reset-password`,
        });
        if (error) throw error;
        toast({
          title: "Password reset email sent",
          description: "Check your inbox for a secure password reset link.",
          variant: "success",
        });
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) throw error;
      toast({
        title: "Password updated",
        description: "Your new password is ready to use.",
        variant: "success",
      });
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error));
    } finally {
      submitInFlight.current = false;
      setLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    if (resendInFlight.current || resendCooldown > 0) return;

    resendInFlight.current = true;
    setResendLoading(true);
    setResendError("");

    try {
      const { error } = await getSupabaseBrowserClient().auth.resend({
        type: "signup",
        email: values.email.trim(),
        options: {
          emailRedirectTo: getEmailVerificationRedirect(),
        },
      });

      if (error) throw error;

      setResendCooldown(60);
    } catch (error) {
      setResendError(getAuthErrorMessage(error));
    } finally {
      resendInFlight.current = false;
      setResendLoading(false);
    }
  };

  const startOAuth = async (provider: "google") => {
    if (submitInFlight.current) return;
    submitInFlight.current = true;
    setLoading(true);
    setSubmitError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const next = window.location.pathname === "/provider-login"
        ? "/tenant-dashboard"
        : window.location.pathname;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
    } catch (error) {
      submitInFlight.current = false;
      setLoading(false);
      setSubmitError(getAuthErrorMessage(error));
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitAuth();
  };

  if (showConfirmation) {
    return (
      <div className="rounded-xl bg-[#eef7f1] p-5 text-center">
        <Mail className="mx-auto size-10 text-[#3c6355]" />
        <h2 className="mt-3 text-lg font-semibold">Check your email</h2>
        <p className="mt-2 text-sm leading-6 text-[#64736b]">
          Registration submitted. Please check your email and click the
          verification link to activate your account: {" "}
          <strong>{values.email}</strong>.
          Check your inbox or spam folder, then return here to sign in.
        </p>
        {resendError && (
          <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-left text-sm text-red-700">
            {resendError}
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => void resendVerificationEmail()}
          disabled={resendLoading || resendCooldown > 0}
          className="mt-5 w-full border-[#3c6355] text-[#3c6355] hover:bg-[#eef7f1]"
        >
          {resendLoading
            ? "Sending…"
            : resendCooldown > 0
              ? `Resend available in ${resendCooldown}s`
              : "Resend verification email"}
        </Button>
        <Link href="/login" className="mt-5 inline-flex text-sm font-semibold text-[#3c6355] hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  const isPasswordMode = mode === "login" || mode === "signup";
  const title =
    mode === "login"
      ? "Sign in"
      : mode === "signup"
        ? "Create account"
        : mode === "forgot"
          ? "Send reset link"
          : "Update password";

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {notice && (
          <p
            role={notice.variant === "error" ? "alert" : "status"}
            className={
              notice.variant === "error"
                ? "rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
                : "rounded-md bg-[#eef7f1] px-3 py-2 text-sm text-[#3c6355]"
            }
          >
            {notice.message}
          </p>
        )}

        {mode !== "reset" && (
          <div>
            <Label htmlFor="auth-email">Email</Label>
            <div className="relative mt-2">
              <Mail className="pointer-events-none absolute left-3 top-2.5 size-4 text-[#789084]" />
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="you@example.com"
                className="pl-9"
                aria-invalid={Boolean(errors.email)}
              />
            </div>
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>
        )}

        {mode !== "forgot" && (
          <>
            <div>
              <Label htmlFor="auth-password">{mode === "reset" ? "New password" : "Password"}</Label>
              <div className="relative mt-2">
                <LockKeyhole className="pointer-events-none absolute left-3 top-2.5 size-4 text-[#789084]" />
                <Input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={values.password}
                  onChange={(event) => update("password", event.target.value)}
                  placeholder="At least 8 characters"
                  className="pl-9 pr-10"
                  aria-invalid={Boolean(errors.password)}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-2.5 text-[#789084]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
            </div>

            {(mode === "signup" || mode === "reset") && (
              <div>
                <Label htmlFor="auth-confirm-password">Confirm password</Label>
                <div className="relative mt-2">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-2.5 size-4 text-[#789084]" />
                  <Input
                    id="auth-confirm-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={values.confirmPassword}
                    onChange={(event) => update("confirmPassword", event.target.value)}
                    placeholder="Repeat your password"
                    className="pl-9"
                    aria-invalid={Boolean(errors.confirmPassword)}
                  />
                </div>
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
              </div>
            )}
          </>
        )}

        {mode === "login" && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label htmlFor="remember-me" className="inline-flex cursor-pointer items-center gap-2 text-sm text-[#69736d]">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="size-4 rounded border-[#b9c8be] accent-[#3c6355] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
              />
              Remember me
            </label>
            <div className="flex justify-end">
            {onForgotPassword ? (
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-sm font-semibold text-[#3c6355] hover:underline"
              >
                Forgot password?
              </button>
            ) : (
              <Link href="/forgot-password" className="text-sm font-semibold text-[#3c6355] hover:underline">
                Forgot password?
              </Link>
            )}
            </div>
          </div>
        )}

        {submitError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {submitError}
          </p>
        )}

        <Button type="submit" disabled={loading} className="h-11 w-full bg-[#3c6355] text-white hover:bg-[#2f5044]">
          {loading ? "Please wait…" : title}
        </Button>

        {isPasswordMode && (
          <>
            <div className="flex items-center gap-3 text-xs text-[#8a948e]">
              <span className="h-px flex-1 bg-[#e0e7e2]" />or<span className="h-px flex-1 bg-[#e0e7e2]" />
            </div>
            <div className="grid gap-2">
              <Button type="button" variant="outline" disabled={loading} onClick={() => void startOAuth("google")} className="h-10 gap-2">
                <Image src="/img/logo/google.svg" alt="" width={16} height={16} /> Google
              </Button>
            </div>
          </>
        )}
      </form>

      {mode === "login" && (
        <p className="mt-5 text-center text-sm text-[#6e7872]">
          New to Aspen?{" "}
          {onCreateAccount ? (
            <button type="button" onClick={onCreateAccount} className="font-semibold text-[#3c6355] hover:underline">
              Create an account
            </button>
          ) : (
            <Link href="/signup" className="font-semibold text-[#3c6355] hover:underline">
              Create an account
            </Link>
          )}
        </p>
      )}
      {mode === "signup" && (
        <p className="mt-5 text-center text-sm text-[#6e7872]">
          Already have an account?{" "}
          {onSignIn ? (
            <button type="button" onClick={onSignIn} className="font-semibold text-[#3c6355] hover:underline">
              Sign in
            </button>
          ) : (
            <Link href="/login" className="font-semibold text-[#3c6355] hover:underline">
              Sign in
            </Link>
          )}
        </p>
      )}
      {(mode === "forgot" || mode === "reset") && (
        <p className="mt-5 text-center text-sm text-[#6e7872]">
          {onSignIn ? (
            <button
              type="button"
              onClick={onSignIn}
              className="font-semibold text-[#3c6355] hover:underline"
            >
              Back to sign in
            </button>
          ) : (
            <Link href="/login" className="font-semibold text-[#3c6355] hover:underline">
              Back to sign in
            </Link>
          )}
        </p>
      )}

      <AlertDialog open={Boolean(suggestion)} onOpenChange={(open) => !open && setSuggestion(null)}>
        <AlertDialogHeader>
          <AlertDialogTitle>Possible email typo</AlertDialogTitle>
          <AlertDialogDescription>
            You entered <strong>{suggestion?.entered}</strong>. Did you mean{" "}
            <strong>{suggestion?.suggested}</strong>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setSuggestion(null); void submitAuth(true); }}>
            Keep anyway
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => { const current = suggestion; if (current) update("email", current.suggested); setSuggestion(null); if (current) void submitAuth(true, current.suggested); }}>
            Use suggested email
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </>
  );
}
