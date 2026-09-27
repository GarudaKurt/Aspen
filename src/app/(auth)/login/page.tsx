import { AuthForm } from "@/features/auth/components/auth-form";
import { AuthShell } from "@/features/auth/components/auth-shell";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Customer account"
      title="Sign in to Aspen"
      description="Save trusted businesses, request appointments, and keep every conversation in one place."
    >
      <AuthForm mode="login" />
    </AuthShell>
  );
}
