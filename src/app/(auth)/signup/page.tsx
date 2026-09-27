import { AuthForm } from "@/features/auth/components/auth-form";
import { AuthShell } from "@/features/auth/components/auth-shell";

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Customer account"
      title="Create your Aspen account"
      description="Join Aspen to save pet-service businesses and manage your appointments with ease."
    >
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
