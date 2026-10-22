import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";

function safeNextPath(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const flow = url.searchParams.get("flow");
  const nextPath = safeNextPath(url.searchParams.get("next"));

  if (!code) {
    const error = flow === "verification" ? "verification_failed" : "missing_code";
    return NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const authError = flow === "verification" ? "verification_failed" : "oauth_failed";
    return NextResponse.redirect(new URL(`/login?error=${authError}`, request.url));
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
