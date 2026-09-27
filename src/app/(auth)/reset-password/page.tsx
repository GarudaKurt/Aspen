import { AuthForm } from "@/features/auth/components/auth-form";
import { AuthShell } from "@/features/auth/components/auth-shell";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Set a new password"
      description="Choose a strong password for your Aspen account."
    >
      <AuthForm mode="reset" />
    </AuthShell>
  );
}
