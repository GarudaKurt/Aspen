import { z } from "zod";

export const providerApplicationDecisionSchema = z
  .object({
    applicationId: z.string().uuid(),
    decision: z.enum(["approved", "rejected"]),
    rejectionReason: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .superRefine((value, context) => {
    if (value.decision === "rejected" && !value.rejectionReason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rejectionReason"],
        message: "A rejection reason is required.",
      });
    }
  });

export type ProviderApplicationDecision = z.infer<typeof providerApplicationDecisionSchema>;
