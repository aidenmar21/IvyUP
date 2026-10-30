import "server-only";
import { render } from "@react-email/render";
import { Resend } from "resend";
import { EMAIL_FROM, OWNER_NOTIFY_EMAIL } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmailLayout } from "./layout";

type SendArgs = {
  to: string;
  subject: string;
  body: string;
  template: string;
  replyTo?: string;
  link?: { studentId?: string; applicationId?: string; tutorId?: string };
  /** Skip the email_log row (owner notifications). */
  log?: boolean;
};

export type SendResult = { ok: true; status: "sent" | "dev_outbox" } | { ok: false; error: string };

/**
 * Sends a branded email through Resend and records it in email_log. Without a
 * RESEND_API_KEY in development the email is printed to the server console
 * (status "dev_outbox") so every flow can be exercised locally.
 */
export async function sendEmail({ to, subject, body, template, replyTo, link, log = true }: SendArgs): Promise<SendResult> {
  const html = await render(<EmailLayout preview={subject} body={body} />);
  const text = body;
  const apiKey = process.env.RESEND_API_KEY;

  let status: "sent" | "dev_outbox" | "failed" = "sent";
  let providerId: string | null = null;
  let error: string | null = null;

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "Email isn't set up yet. Add RESEND_API_KEY in Netlify." };
    }
    status = "dev_outbox";
    console.info(`\n[dev outbox] to=${to}\nsubject=${subject}\n${text}\n`);
  } else {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text,
      replyTo: replyTo ?? OWNER_NOTIFY_EMAIL,
    });
    if (result.error) {
      status = "failed";
      error = result.error.message;
    } else {
      providerId = result.data?.id ?? null;
    }
  }

  if (log) {
    await createAdminClient().from("email_log").insert({
      to_email: to,
      subject,
      template,
      student_id: link?.studentId ?? null,
      application_id: link?.applicationId ?? null,
      tutor_id: link?.tutorId ?? null,
      provider_id: providerId,
      status,
      error,
    });
  }

  if (status === "failed") return { ok: false, error: error ?? "The email didn't send. Try again." };
  return { ok: true, status };
}

/** Fire-and-forget notification to the owner's inbox. Never throws. */
export async function notifyOwner(subject: string, body: string) {
  try {
    await sendEmail({ to: OWNER_NOTIFY_EMAIL, subject, body, template: "owner_notification", log: false });
  } catch (e) {
    console.error("Owner notification failed", e);
  }
}
