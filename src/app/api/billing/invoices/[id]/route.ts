import { billingId } from "@/features/billing/schemas";
import { invoiceDetail } from "@/features/billing/api/queries";
import { invoiceNumber, invoiceStatement } from "@/features/billing/invoice";
import { getDashboardBusiness } from "@/features/tenant-dashboard/overview-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const business = await getDashboardBusiness();
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (business.error) return new Response(null, { status: 503, headers });
  if (!billingId.safeParse(id).success || !business.data)
    return new Response(null, { status: 404, headers });
  const detail = await invoiceDetail(id, business.data.id);
  if (!detail) return new Response(null, { status: 404, headers });
  return new Response(invoiceStatement(detail.invoice, detail.payments), {
    headers: {
      ...headers,
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${invoiceNumber(detail.invoice)}.txt"`,
    },
  });
}
