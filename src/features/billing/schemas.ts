import { z } from "zod";

export const billingId = z.string().uuid();
export const billingDate = z.string().date();
export const receiptMethod = z.enum(["bank", "gcash", "maya", "cash"]);
export const methodSchema = z.enum(["bank", "gcash", "maya", "cash", "card"]);
export const receiptSchema = z
  .object({
    method: receiptMethod,
    invoice: billingId,
    reference: z.string().trim().max(100).default(""),
    amount: z
      .string()
      .regex(/^\d{1,8}(?:\.\d{1,2})?$/)
      .refine((value) => Number(value) > 0),
    paid: billingDate,
    due: billingDate,
  })
  .refine(
    (value) =>
      (value.method === "cash" && !value.reference) ||
      value.reference.length >= 3,
    {
      path: ["reference"],
      message: "Enter the transaction reference (at least 3 characters).",
    },
  );
export const receiptExtensions = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "application/pdf": ["pdf"],
} as const;
export function validReceiptFile(file: File) {
  if (!Object.hasOwn(receiptExtensions, file.type)) return false;
  const extensions: readonly string[] =
    receiptExtensions[file.type as keyof typeof receiptExtensions] ?? [];
  return (
    file.size > 0 &&
    file.size <= receiptLimit &&
    extensions.includes(file.name.split(".").pop()?.toLowerCase() ?? "") &&
    file.name.includes(".")
  );
}
export const enrollmentSchema = z
  .object({
    slug: z.string().trim().min(1).max(180),
    plan: z.enum(["Free", "Basic", "Professional", "Enterprise"]),
    due: billingDate.nullable(),
  })
  .refine((value) => (value.plan === "Free") === (value.due === null));
export const reviewSchema = z
  .object({
    id: billingId,
    decision: z.enum(["approve", "reject"]),
    reason: z.string().trim().max(500),
  })
  .refine((value) => value.decision === "approve" || value.reason.length > 0);
export const receiptLimit = 3 * 1024 * 1024;
