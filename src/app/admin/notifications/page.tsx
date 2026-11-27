import Link from "next/link";
import { NotificationCenter } from "@/features/notifications";
import { pageNumber } from "@/features/billing/api/queries";
import { money } from "@/features/billing/mappers";
import { methodLabels, type Method } from "@/features/billing/types";
import { requireRole } from "@/server/auth/guard";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export default async function AdminNotifications({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireRole("admin", "/admin/notifications");
  const page = pageNumber((await searchParams).page);
  const db = await createSupabaseServerClient();
  const { data, count, error } = await db
    .from("tenant_payments")
    .select("id,amount_php,method,submitted_at,tenant_invoices(billed_to)", {
      count: "exact",
    })
    .eq("status", "pending")
    .order("submitted_at")
    .order("id")
    .range((page - 1) * 20, page * 20 - 1);
  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      <Link href="/admin/billing" className="text-sm underline">
        Manage tenant billing
      </Link>
      {error ? (
        <p role="alert">Payment notifications could not be loaded.</p>
      ) : (
        <NotificationCenter
          audience="admin"
          notifications={(data ?? []).map((p) => ({
            id: p.id,
            kind: "Payments",
            title: "Payment receipt awaiting verification",
            detail: [
              (Array.isArray(p.tenant_invoices)
                ? p.tenant_invoices[0]
                : p.tenant_invoices
              )?.billed_to,
              money(p.amount_php),
              methodLabels[p.method as Method],
            ]
              .filter(Boolean)
              .join(" · "),
            timestamp: new Intl.DateTimeFormat("en-PH", {
              timeZone: "Asia/Manila",
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(p.submitted_at)),
            href: `/admin/billing?page=${page}#payment-${p.id}`,
          }))}
        />
      )}
      <nav className="flex gap-4 text-sm">
        {page > 1 && <Link href={`?page=${page - 1}`}>Previous</Link>}
        {page * 20 < (count ?? 0) && (
          <Link href={`?page=${page + 1}`}>Next</Link>
        )}
      </nav>
    </main>
  );
}
