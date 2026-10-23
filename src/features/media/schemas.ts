import { z } from "zod";

export const mediaCategorySchema = z.enum([
  "business_cover",
  "business_gallery",
  "service_photo",
  "identity_document",
  "review_photo",
]);

export const mediaVisibilitySchema = z.enum(["public", "private"]);

export const mediaUploadRequestSchema = z
  .object({
    businessId: z.string().uuid().optional(),
    serviceId: z.string().uuid().optional(),
    providerApplicationId: z.string().uuid().optional(),
    category: mediaCategorySchema,
    visibility: mediaVisibilitySchema,
    fileName: z.string().trim().min(1).max(180),
    contentType: z.enum([
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ]),
    byteSize: z.number().int().positive().max(5 * 1024 * 1024),
  })
  .superRefine((value, context) => {
    const requiredTarget =
      value.category === "service_photo"
        ? value.serviceId
        : value.category === "identity_document"
          ? value.providerApplicationId
          : value.businessId;

    if (!requiredTarget) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["category"],
        message: "This media category requires its associated record.",
      });
    }

    const targetCount = [value.businessId, value.serviceId, value.providerApplicationId].filter(Boolean).length;
    if (targetCount !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["category"],
        message: "Provide exactly one associated record for this upload.",
      });
    }

    if (value.category === "identity_document" && value.visibility !== "private") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["visibility"],
        message: "Identity documents must remain private.",
      });
    }

    if (value.category === "identity_document" && value.contentType === "image/webp") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contentType"],
        message: "WebP is not accepted for identity documents.",
      });
    }

    if (value.category !== "identity_document" && value.contentType === "application/pdf") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contentType"],
        message: "PDF files are only accepted for identity documents.",
      });
    }
  });

export type MediaUploadRequest = z.infer<typeof mediaUploadRequestSchema>;
