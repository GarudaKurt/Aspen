import { z } from "zod";

const emailDomainCandidates = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"] as const;

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .email("Enter a valid email address.")
  .refine((value) => {
    const [localPart, domain] = value.split("@");
    return Boolean(
      localPart &&
        domain &&
        !localPart.includes("..") &&
        !domain.includes("..") &&
        /^[^\s@]+$/.test(localPart) &&
        /^[^\s@]+(?:\.[^\s@]+)+$/.test(domain),
    );
  }, "Enter a valid email address.");

export const philippinePhoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required.")
  .transform((value) => value.replace(/[\s()-]/g, ""))
  .refine((value) => /^09\d{9}$/.test(value) || /^\+639\d{9}$/.test(value), {
    message: "Enter a valid Philippine mobile number.",
  })
  .transform((value) => (value.startsWith("09") ? `+63${value.slice(1)}` : value));

export type EmailSuggestion = {
  entered: string;
  suggested: string;
};

function editDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];

    for (let column = 1; column <= right.length; column += 1) {
      current[column] =
        left[row - 1] === right[column - 1]
          ? previous[column - 1]
          : Math.min(previous[column - 1] + 1, previous[column] + 1, current[column - 1] + 1);
    }

    for (let column = 0; column <= right.length; column += 1) {
      previous[column] = current[column];
    }
  }

  return previous[right.length];
}

export function getEmailSuggestion(value: string): EmailSuggestion | null {
  const parsed = emailSchema.safeParse(value);
  if (!parsed.success) return null;

  const [localPart, domain] = parsed.data.split("@");
  const normalizedDomain = domain.toLowerCase();
  if (emailDomainCandidates.includes(normalizedDomain as (typeof emailDomainCandidates)[number])) {
    return null;
  }

  const suggestedDomain = emailDomainCandidates.find(
    (candidate) => editDistance(normalizedDomain, candidate) <= 2,
  );

  return suggestedDomain
    ? { entered: parsed.data, suggested: `${localPart}@${suggestedDomain}` }
    : null;
}
