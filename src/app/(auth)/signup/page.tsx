import { Suspense } from "react";
import { AuthSkeleton } from "@/components/loading/public-skeletons";

import { AuthRoutePage } from "@/features/auth/components/auth-route-page";

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthSkeleton fields={3} />}>
      <AuthRoutePage initialMode="signup" />
    </Suspense>
  );
}
