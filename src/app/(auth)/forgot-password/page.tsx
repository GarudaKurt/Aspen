import { Suspense } from "react";

import { AuthRoutePage } from "@/features/auth/components/auth-route-page";

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthRoutePage initialMode="forgot" />
    </Suspense>
  );
}
