"use server";

import { applicationSchema } from "@/lib/validation/application";
import { contactSchema } from "@/lib/validation/contact";
import { fieldErrorsFrom } from "@/lib/validation/shared";
import { signupSchema } from "@/lib/validation/signup";
import { claimSubmission, releaseSubmission } from "@/lib/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyOwner, sendEmail } from "@/lib/email/send";
import { applicantConfirmation, familyConfirmation } from "@/lib/email/templates";
import { isSupabaseConfigured, SITE_URL } from "@/lib/env";
import { subjectsLabel } from "@/lib/format";
import type { ActionResult } from "@/lib/types";

const NOT_READY: ActionResult = {
  ok: false,
  error: "We couldn't save this right now. Please email hello@ivyup.org and we'll take care of you.",
};
const RATE_LIMITED: ActionResult = {
  ok: false,
  error: "We've received several submissions from this connection. Please wait a little and try again, or email hello@ivyup.org.",
};

export async function submitSignup(input: unknown): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const v = parsed.data;
  if (v.website) return { ok: true }; // honeypot filled: quietly drop
  if (!isSupabaseConfigured()) return NOT_READY;

  const db = createAdminClient();
  const claim = await claimSubmission(db, "signup", v.idempotencyKey);
  if (claim === "duplicate") return { ok: true };
  if (claim === "rate_limited") return RATE_LIMITED;

  try {
    const { data: family, error: famErr } = await db
      .from("families")
      .insert({
        parent_name: v.parentName,
        parent_email: v.parentEmail,
        parent_phone: v.parentPhone,
        parent_sms_opt_in: v.parentSms,
      })
      .select("id")
      .single();
    if (famErr) throw famErr;

    const apExams = v.tests.includes("AP exam") ? v.apExams : [];
    const { error: stuErr } = await db.from("students").insert({
      family_id: family.id,
      first_name: v.studentFirstName,
      grade: v.studentGrade,
      phone: v.studentPhone ?? null,
      email: v.studentEmail ?? null,
      email_updates: v.studentEmailUpdates,
      text_updates: v.studentTextUpdates,
      subjects: v.tests,
      ap_exams: apExams,
      preferred_tutor: v.preferredTutor ?? null,
      consent_guardian: true,
      consent_contact: true,
      source: "form",
    });
    if (stuErr) throw stuErr;

    const subjects = subjectsLabel(v.tests, apExams);
    await Promise.all([
      notifyOwner(
        `New family: ${v.studentFirstName} (${v.studentGrade}) · ${subjects}`,
        `${v.parentName} signed up ${v.studentFirstName} (${v.studentGrade}) for ${subjects}.

Parent: ${v.parentName}
Email: ${v.parentEmail}
Phone: ${v.parentPhone}${v.parentSms ? " (wants texts)" : ""}
Preferred tutor: ${v.preferredTutor ?? "none given"}

Open form responses: ${SITE_URL}/admin/prospects`,
      ),
      sendEmail({
        to: v.parentEmail,
        template: "family_confirmation",
        ...familyConfirmation({ parentName: v.parentName, studentName: v.studentFirstName }),
      }).catch((e) => console.error("family confirmation", e)),
    ]);
    return { ok: true };
  } catch (e) {
    console.error("submitSignup", e);
    await releaseSubmission(db, v.idempotencyKey);
    return NOT_READY;
  }
}

export async function submitApplication(input: unknown): Promise<ActionResult> {
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const v = parsed.data;
  if (v.website) return { ok: true };
  if (!isSupabaseConfigured()) return NOT_READY;

  const db = createAdminClient();
  const claim = await claimSubmission(db, "application", v.idempotencyKey);
  if (claim === "duplicate") return { ok: true };
  if (claim === "rate_limited") return RATE_LIMITED;

  try {
    const { error } = await db.from("tutor_applications").insert({
      full_name: v.fullName,
      preferred_name: v.preferredName ?? null,
      email: v.email,
      phone: v.phone,
      school: v.school,
      year: v.year,
      major: v.major,
      semester_state: v.semesterState,
      time_zone: v.timeZone,
      subjects: v.subjects,
      grade_levels: v.gradeLevels,
      sat_score: v.satScore ?? null,
      act_score: v.actScore ?? null,
      ap_scores: v.apScores ?? null,
      weekly_availability: v.weeklyAvailability,
      max_hours_per_week: v.maxHours,
      max_students: v.maxStudents,
      unavailable_periods: v.unavailablePeriods ?? null,
      summer_availability: v.summerAvailability ?? null,
      setup: v.setup,
      prior_experience: v.priorExperience,
      experience_details: v.experienceDetails ?? null,
      experience_with: v.experienceWith,
      bio: v.bio,
      fun_fact: v.funFact ?? null,
      answer_first_session: v.answerFirstSession,
      answer_why_ivyup: v.answerWhyIvyUp,
      ack_adult: true,
      ack_recorded: true,
      ack_background_check: true,
      ack_contractor: true,
      ack_non_solicit: true,
      referral_source: v.referralSource ?? null,
      anything_else: v.anythingElse ?? null,
    });
    if (error) throw error;

    await Promise.all([
      notifyOwner(
        `New tutor application: ${v.fullName} · ${v.school}`,
        `${v.fullName} (${v.school}, ${v.year}, ${v.major}) applied to tutor.

Subjects: ${v.subjects.join(", ")}
Scores: SAT ${v.satScore ?? "—"} · ACT ${v.actScore ?? "—"}

Review: ${SITE_URL}/admin/tutors`,
      ),
      sendEmail({ to: v.email, template: "applicant_confirmation", ...applicantConfirmation({ name: v.fullName }) }).catch((e) =>
        console.error("applicant confirmation", e),
      ),
    ]);
    return { ok: true };
  } catch (e) {
    console.error("submitApplication", e);
    await releaseSubmission(db, v.idempotencyKey);
    return NOT_READY;
  }
}

export async function submitContact(input: unknown): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const v = parsed.data;
  if (v.website) return { ok: true };
  if (!isSupabaseConfigured()) return NOT_READY;

  const db = createAdminClient();
  const claim = await claimSubmission(db, "contact", v.idempotencyKey);
  if (claim === "duplicate") return { ok: true };
  if (claim === "rate_limited") return RATE_LIMITED;

  try {
    const { error } = await db.from("contact_messages").insert({
      name: v.name,
      email: v.email,
      phone: v.phone ?? null,
      topic: v.topic,
      message: v.message,
    });
    if (error) throw error;
    await notifyOwner(
      `New message from ${v.name}: ${v.topic}`,
      `${v.name} (${v.email}${v.phone ? `, ${v.phone}` : ""}) wrote:

${v.message}

Inbox: ${SITE_URL}/admin/inbox`,
    );
    return { ok: true };
  } catch (e) {
    console.error("submitContact", e);
    await releaseSubmission(db, v.idempotencyKey);
    return NOT_READY;
  }
}
