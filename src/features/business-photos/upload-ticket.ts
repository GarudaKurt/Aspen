import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const photoTicketSchema = z.object({
  id: z.string().uuid(), ownerId: z.string().uuid(), targetId: z.string().uuid(),
  kind: z.enum(["business", "service"]), action: z.enum(["add", "replace", "add_cover", "replace_cover"]),
  photoId: z.string().uuid().optional(), name: z.string().min(1).max(255),
  type: z.enum(["image/jpeg", "image/png", "image/webp"]), size: z.number().int().positive().max(20 * 1024 * 1024),
  sha256: z.string().regex(/^[a-f0-9]{64}$/), expires: z.number().int(),
});
export type PhotoTicket = z.infer<typeof photoTicketSchema>;

function signature(payload: string) {
  const secret = process.env.R2_SECRET_ACCESS_KEY;
  if (!secret) throw new Error("Photo upload signing is not configured.");
  // Domain separation: this signature cannot be used as an S3 credential/signature.
  return createHmac("sha256", secret).update(`aspen-photo-ticket-v1:${payload}`).digest();
}
export function signPhotoTicket(ticket: PhotoTicket) {
  const payload = Buffer.from(JSON.stringify(photoTicketSchema.parse(ticket))).toString("base64url");
  return `${payload}.${signature(payload).toString("base64url")}`;
}
export function verifyPhotoTicket(value: string): PhotoTicket {
  if (value.length > 4096) throw new Error("Invalid upload ticket.");
  const [payload, mac, extra] = value.split(".");
  if (!payload || !mac || extra) throw new Error("Invalid upload ticket.");
  const expected = signature(payload), actual = Buffer.from(mac, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("Invalid upload ticket.");
  const ticket = photoTicketSchema.parse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
  if (ticket.expires < Date.now()) throw new Error("Upload ticket expired. Retry the image to renew it.");
  return ticket;
}
export function photoObjectKey(ticket: PhotoTicket) {
  const extension = ticket.type === "image/jpeg" ? ".jpg" : ticket.type === "image/png" ? ".png" : ".webp";
  return `${ticket.kind === "business" ? "businesses" : "services"}/${ticket.targetId}/${ticket.kind === "business" ? "business_gallery" : "service_photo"}/${ticket.id}-photo${extension}`;
}
export function photoStagingKey(ticket: PhotoTicket) { return `pending/${ticket.ownerId}/${ticket.id}/${ticket.sha256}`; }
