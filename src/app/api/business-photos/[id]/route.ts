import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { createR2DownloadUrl } from "@/lib/r2/client";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new Response(null, { status: 404 });
  try {
    const supabase = await createSupabaseServerClient();
    // RLS allows published businesses, their owner, and administrators only.
    const { data } = await supabase.from("media_assets")
      .select("object_key, businesses!inner(id)").eq("id", id)
      .eq("visibility", "public").eq("status", "active")
      .in("category", ["business_cover", "business_gallery"]).maybeSingle();
    if (!data) return new Response(null, { status: 404 });
    const response = NextResponse.redirect(await createR2DownloadUrl(data.object_key, 60));
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    return new Response(null, { status: 503 });
  }
}
