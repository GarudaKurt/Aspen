import { Suspense } from "react";
import { AuthSkeleton } from "@/components/loading/public-skeletons";

import { AuthRoutePage } from "@/features/auth/components/auth-route-page";

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthSkeleton fields={2} />}>
      <AuthRoutePage initialMode="login" />
    </Suspense>
  );
}
