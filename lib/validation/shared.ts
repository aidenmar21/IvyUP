import { z } from "zod";

export const trimmed = (max = 200) => z.string().trim().max(max, `Keep this under ${max} characters`);
export const required = (label: string, max = 200) =>
  trimmed(max).min(1, `${label} is required`);
export const optional = (max = 200) =>
  trimmed(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const PHONE_DIGITS = /\d/g;
export const phone = (label = "Phone") =>
  z
    .string()
    .trim()
    .refine((v) => (v.match(PHONE_DIGITS) ?? []).length >= 10, `${label} needs at least 10 digits`)
    .refine((v) => (v.match(PHONE_DIGITS) ?? []).length <= 15, `${label} looks too long`);
export const optionalPhone = (label = "Phone") =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || (v.match(PHONE_DIGITS) ?? []).length >= 10, `${label} needs at least 10 digits`);
export const email = (label = "Email") =>
  z.string().trim().toLowerCase().min(1, `${label} is required`).email("Enter a valid email address").max(200);
export const optionalEmail = () =>
  z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || z.string().email().safeParse(v).success, "Enter a valid email address");

/** Every public form carries these to stop duplicate submits and bots. */
export const submissionMeta = z.object({
  idempotencyKey: z.string().min(16).max(64),
  website: z.string().max(0).optional(), // honeypot: real people never see this field
});

export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
