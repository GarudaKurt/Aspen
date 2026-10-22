import "server-only";

import { redirect } from "next/navigation";

import { getCurrentProfile, isEmailVerified } from "./session";

export async function requireUser(nextPath = "/") {
  const current = await getCurrentProfile();
  if (!current?.user || !isEmailVerified(current.user)) {
    const error = current?.user ? "email_not_confirmed" : null;
    const query = error ? `&error=${error}` : "";
    redirect(`/login?next=${encodeURIComponent(nextPath)}${query}`);
  }
  return current;
}

export async function requireRole(
  role: "provider" | "admin",
  nextPath = "/",
) {
  const current = await requireUser(nextPath);
  const allowed = current.profile?.role === role || current.profile?.role === "admin";

  if (!allowed) redirect("/");
  return current;
}
