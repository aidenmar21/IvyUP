import { z } from "zod";
import { email, optionalPhone, required, submissionMeta } from "./shared";

export const CONTACT_TOPICS = ["Tutoring for my student", "Becoming a tutor", "Something else"] as const;

export const contactSchema = z
  .object({
    name: required("Name", 120),
    email: email(),
    phone: optionalPhone(),
    topic: z.enum(CONTACT_TOPICS),
    message: required("Message", 3000).refine((v) => v.length >= 10, "Tell us a little more"),
  })
  .merge(submissionMeta);

export type ContactInput = z.input<typeof contactSchema>;
