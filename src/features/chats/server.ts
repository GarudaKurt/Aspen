import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { getCurrentProfile, isEmailVerified } from "@/server/auth/session";

export class ChatError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function chatClient() {
  const current = await getCurrentProfile();
  if (!current || !isEmailVerified(current.user))
    throw new ChatError(
      "Please sign in with a verified account to continue.",
      401,
    );
  if (!["customer", "provider"].includes(current.profile?.role ?? ""))
    throw new ChatError(
      "Messaging is available to customers and providers.",
      403,
    );
  return createSupabaseServerClient();
}
export function chatFailure(error: unknown) {
  if (error instanceof ChatError) return error;
  const db = error as { code?: string; message?: string };
  if (db?.code === "42501")
    return new ChatError(
      "You no longer have access to this conversation.",
      403,
    );
  if (["42P01", "42703", "PGRST202", "42883"].includes(db?.code ?? ""))
    return new ChatError(
      "Messaging setup is incomplete. Apply database migration 0034.",
      503,
    );
  // Only explicit messages from our RPCs are exposed; never raw database details.
  if (
    db?.code === "P0001" &&
    /^(Too many chat requests|Daily message limit|Messages must|Messages can|This retry identifier|This business is not|Choose another business|Messaging is unavailable|Only |Message |The message|Editing |Deleting |This message)/.test(
      db.message ?? "",
    )
  )
    return new ChatError(db.message!, 400);
  return new ChatError("Messaging could not be completed. Please retry.", 503);
}
