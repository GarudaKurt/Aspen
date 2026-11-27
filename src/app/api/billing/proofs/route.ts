import { discardReceipt, putReceipt, readReceipt } from "@/lib/r2/client";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getRequiredSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { getCurrentProfile, isEmailVerified } from "@/server/auth/session";
import { getDashboardBusiness } from "@/features/tenant-dashboard/overview-data";
import { validateBusinessImageUpload } from "@/features/business-photos/validate";
import {
  billingId,
  validReceiptFile,
  receiptExtensions,
  receiptLimit,
  receiptSchema,
} from "@/features/billing/schemas";
import { getSubscription } from "@/features/billing/api/queries";
import { manilaDate } from "@/features/tenant-calendar/dates";
import { revalidatePath } from "next/cache";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
const fail = (message: string, status: number) =>
  Response.json({ message }, { status, headers: privateHeaders });
function receiptKey(business: string, id: string) {
  return `billing-receipts/${business}/${id}`;
}

// Check both ends and the referenced cross-reference table or stream. Keep PDFs opaque:
// no PDF scripting, decompression, or document rendering on the server.
function isReceiptPdf(bytes: Uint8Array) {
  const data = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (!/^%PDF-(1\.[0-7]|2\.0)[\r\n]/.test(data.toString("latin1", 0, 12)))
    return false;
  const end = /startxref\s+(\d+)\s+%%EOF\s*$/.exec(
    data.subarray(-1024).toString("latin1"),
  );
  if (!end) return false;
  const offset = Number(end[1]);
  if (!Number.isSafeInteger(offset) || offset <= 0 || offset >= data.length)
    return false;
  const xref = data.toString(
    "latin1",
    offset,
    Math.min(offset + 1024, data.length),
  );
  return (
    /^xref\s+\d+\s+\d+/.test(xref) ||
    /^\d+\s+\d+\s+obj\s*<<[^]*?\/Type\s*\/XRef\b/.test(xref)
  );
}
const bodyLimit = receiptLimit + 16384;

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return fail("Invalid request origin.", 403);
  const current = await getCurrentProfile();
  if (
    !current ||
    !isEmailVerified(current.user) ||
    current.profile?.role !== "provider"
  )
    return fail("Provider sign-in required.", 403);
  const { data: business } = await getDashboardBusiness();
  if (!business) return fail("No connected business was found.", 403);
  const { data: s } = await getSubscription(business.id);
  if (!s?.due_on || !s.renew)
    return fail("An enrolled paid plan with renewal enabled is required.", 409);
  if (
    !request.body ||
    !request.headers.get("content-type")?.startsWith("multipart/form-data")
  )
    return fail("Choose a receipt file.", 400);
  if (Number(request.headers.get("content-length")) > bodyLimit)
    return fail("Choose a receipt up to 3 MiB.", 413);
  const db = await createSupabaseServerClient();
  const reservation = await db.rpc("begin_billing_upload", {
    p_business: business.id,
  });
  if (reservation.error)
    return fail("Billing is temporarily unavailable.", 503);
  if (!reservation.data)
    return fail(
      "Check for a pending receipt, or wait ten minutes before retrying.",
      429,
    );
  const reader = request.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  let form;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > bodyLimit) {
        await reader.cancel();
        return fail("Choose a receipt up to 3 MiB.", 413);
      }
      chunks.push(new Uint8Array(value));
    }
    form = await new Response(new Blob(chunks), {
      headers: { "content-type": request.headers.get("content-type")! },
    }).formData();
  } catch {
    return fail("The receipt could not be read.", 400);
  }
  const parsed = receiptSchema.safeParse(Object.fromEntries(form));
  const file = form.get("proof");
  if (!parsed.success || !(file instanceof File) || !validReceiptFile(file))
    return fail(
      "Check the payment details and choose a JPG, PNG, WebP or PDF up to 3 MiB.",
      400,
    );
  const { reference, paid, method, due, invoice, amount } = parsed.data;
  if (due !== s.due_on || paid > manilaDate())
    return fail("Check the payment date and current invoice.", 409);
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    if (file.type === "application/pdf") {
      if (!isReceiptPdf(bytes))
        return fail("Choose a complete PDF receipt.", 400);
    } else await validateBusinessImageUpload(bytes, file.name, file.type);
  } catch {
    return fail("The receipt could not be validated.", 400);
  }
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return fail("Receipt processing is unavailable.", 503);
  const id = randomUUID(),
    key = receiptKey(business.id, id);
  const service = createClient(getRequiredSupabaseConfig().url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    await putReceipt(key, bytes, file.type);
  } catch {
    return fail(
      "Private receipt storage is unavailable. Please try again.",
      503,
    );
  }
  const result = await service.rpc("record_invoice_receipt", {
    p_invoice: invoice,
    p_business: business.id,
    p_actor: current.user.id,
    p_id: id,
    p_amount: Number(amount),
    p_method: method,
    p_reference: reference,
    p_paid: paid,
    p_due: due,
    p_mime: file.type,
  });
  if (result.error) {
    if (/^[A-Z0-9]{5}$/.test(result.error.code))
      await discardReceipt(key).catch(() =>
        console.error("Receipt cleanup failed", id),
      );
    return fail(
      "Refresh the invoice and check the balance, pending submissions and transaction reference before retrying.",
      409,
    );
  }
  revalidatePath("/admin/notifications");
  revalidatePath("/admin/provider-applications");
  revalidatePath("/tenant-dashboard", "layout");
  revalidatePath("/admin/billing");
  return Response.json({ ok: true }, { headers: privateHeaders });
}

export async function GET(request: Request) {
  const id = billingId.safeParse(new URL(request.url).searchParams.get("id"));
  const current = await getCurrentProfile();
  if (
    !id.success ||
    !current ||
    !isEmailVerified(current.user) ||
    !["admin", "provider"].includes(current.profile?.role ?? "")
  )
    return fail("Receipt unavailable.", 404);
  const db = await createSupabaseServerClient();
  const { data } = await db
    .from("tenant_payments")
    .select("business_id,receipt_mime")
    .eq("id", id.data)
    .maybeSingle();
  if (!data) return fail("Receipt unavailable.", 404);
  let body: BodyInit;
  let mime: string;
  try {
    if (data.receipt_mime) {
      mime = data.receipt_mime;
      body = await readReceipt(receiptKey(data.business_id, id.data));
    } else {
      const legacy = await db.storage
        .from("billing-proofs")
        .download(`${data.business_id}/${id.data}`);
      if (!legacy.data) return fail("The receipt could not be retrieved.", 503);
      body = legacy.data;
      mime = legacy.data.type;
    }
  } catch {
    return fail("The receipt could not be retrieved.", 503);
  }
  const extension =
    receiptExtensions[mime as keyof typeof receiptExtensions]?.[0];
  if (!extension) return fail("Unknown receipt format.", 422);
  return new Response(body, {
    headers: {
      ...privateHeaders,
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="receipt-${id.data}.${extension}"`,
      "Content-Security-Policy": "sandbox; default-src 'none'",
    },
  });
}
