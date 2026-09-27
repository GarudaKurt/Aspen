"use client";

import Link from "next/link";
import { Apple, Chrome, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";

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

import {
  loginSchema,
  recoverySchema,
  resetPasswordSchema,
  signupSchema,
} from "../schemas/auth.schema";

type AuthMode = "login" | "signup" | "forgot" | "reset";
type AuthValues = { email: string; password: string; confirmPassword: string };

export function AuthForm({ mode }: { mode: AuthMode }) {
  const [values, setValues] = useState<AuthValues>({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [suggestion, setSuggestion] = useState<{ entered: string; suggested: string } | null>(null);

  const update = (field: keyof AuthValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const validate = () => {
    const result =
      mode === "login"
        ? loginSchema.safeParse({ email: values.email, password: values.password })
        : mode === "signup"
          ? signupSchema.safeParse(values)
          : mode === "forgot"
            ? recoverySchema.safeParse({ email: values.email })
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

  const submitMock = async (skipEmailSuggestion = false) => {
    if (!validate()) return;

    if (!skipEmailSuggestion && mode !== "reset") {
      const typo = getEmailSuggestion(values.email);
      if (typo) {
        setSuggestion(typo);
        return;
      }
    }

    setLoading(true);
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    setLoading(false);

    if (mode === "signup") {
      setShowConfirmation(true);
      return;
    }

    toast({
      title:
        mode === "forgot"
          ? "Reset email preview ready"
          : mode === "reset"
            ? "Password reset preview ready"
            : "Sign-in preview ready",
      description: "This UI is ready for the authentication integration.",
      variant: "success",
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitMock();
  };

  if (showConfirmation) {
    return (
      <div className="rounded-xl bg-[#eef7f1] p-5 text-center">
        <Mail className="mx-auto size-10 text-[#3c6355]" />
        <h2 className="mt-3 text-lg font-semibold">Check your email</h2>
        <p className="mt-2 text-sm leading-6 text-[#64736b]">
          In the connected experience, a confirmation link will be sent to{" "}
          <strong>{values.email}</strong>.
        </p>
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
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm font-semibold text-[#3c6355] hover:underline">
              Forgot password?
            </Link>
          </div>
        )}

        <Button type="submit" disabled={loading} className="h-11 w-full bg-[#3c6355] text-white hover:bg-[#2f5044]">
          {loading ? "Please wait…" : title}
        </Button>

        {isPasswordMode && (
          <>
            <div className="flex items-center gap-3 text-xs text-[#8a948e]">
              <span className="h-px flex-1 bg-[#e0e7e2]" />or<span className="h-px flex-1 bg-[#e0e7e2]" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" onClick={() => toast("Google sign-in preview")} className="h-10 gap-2">
                <Chrome size={16} /> Google
              </Button>
              <Button type="button" variant="outline" onClick={() => toast("Apple sign-in preview")} className="h-10 gap-2">
                <Apple size={16} /> Apple
              </Button>
            </div>
          </>
        )}
      </form>

      {mode === "login" && (
        <p className="mt-5 text-center text-sm text-[#6e7872]">
          New to Aspen?{" "}
          <Link href="/signup" className="font-semibold text-[#3c6355] hover:underline">Create an account</Link>
        </p>
      )}
      {mode === "signup" && (
        <p className="mt-5 text-center text-sm text-[#6e7872]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#3c6355] hover:underline">Sign in</Link>
        </p>
      )}
      {(mode === "forgot" || mode === "reset") && (
        <p className="mt-5 text-center text-sm text-[#6e7872]">
          <Link href="/login" className="font-semibold text-[#3c6355] hover:underline">Back to sign in</Link>
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
          <AlertDialogCancel onClick={() => { setSuggestion(null); void submitMock(true); }}>
            Keep anyway
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => { if (suggestion) { update("email", suggestion.suggested); } setSuggestion(null); void submitMock(true); }}>
            Use suggested email
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </>
  );
}
