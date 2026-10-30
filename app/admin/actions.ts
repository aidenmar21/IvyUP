"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ownerOrNull } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { tutorLogin } from "@/lib/email/templates";
import { createTutorAccount, resetTutorPassword, setTutorLoginEnabled } from "@/lib/tutor-accounts";
import { etToUtc } from "@/lib/time";
import { AP_EXAMS, GRADES, TESTS } from "@/lib/constants";
import { email, optional, optionalEmail, optionalPhone, required } from "@/lib/validation/shared";
import type { ActionResult, StudentStage, ApplicationStage } from "@/lib/types";

const DENIED = { ok: false as const, error: "Your session ended. Sign in again." };

async function ownerDb() {
  const viewer = await ownerOrNull();
  if (!viewer) return null;
  return { viewer, db: await createClient() };
}

function fail(e: unknown, fallback = "Something went wrong. Try again."): { ok: false; error: string } {
  console.error(e);
  const message = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "";
  return { ok: false, error: message && message.length < 160 ? message : fallback };
}

function refreshAdmin() {
  revalidatePath("/admin", "layout");
}

// ---------------------------------------------------------------------------
// Slots (date + time in Eastern Time)
// ---------------------------------------------------------------------------

const slotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a time"),
  durationMin: z.coerce.number().int().min(10).max(240),
  zoomLink: optional(500),
  location: optional(200),
  notes: optional(2000),
  weekly: z.boolean().optional(),
  until: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});
export type SlotInput = z.input<typeof slotSchema>;

function slotToEvent(slot: z.output<typeof slotSchema>) {
  const starts = etToUtc(slot.date, slot.time);
  const ends = new Date(new Date(starts).getTime() + slot.durationMin * 60_000).toISOString();
  return {
    starts_at: starts,
    ends_at: ends,
    zoom_link: slot.zoomLink ?? null,
    location: slot.location ?? null,
    notes: slot.notes ?? null,
    recurrence: slot.weekly ? "weekly" : "none",
    recurrence_until: slot.weekly ? (slot.until ?? null) : null,
  };
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

export async function emailParent(studentId: string, subject: string, body: string): Promise<ActionResult> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  if (!subject.trim() || !body.trim()) return { ok: false, error: "Add a subject and a message." };
  try {
    const { data: s, error } = await ctx.db
      .from("students")
      .select("id, stage, family:families(parent_email)")
      .eq("id", studentId)
      .single();
    if (error) throw error;
    const to = (s.family as unknown as { parent_email: string } | null)?.parent_email;
    if (!to) return { ok: false, error: "This student has no parent email on file." };
    const sent = await sendEmail({ to, subject, body, template: "consultation_request", link: { studentId } });
    if (!sent.ok) return sent;
    await ctx.db
      .from("students")
      .update({ last_emailed_at: new Date().toISOString(), ...(s.stage === "new" ? { stage: "contacted" } : {}) })
      .eq("id", studentId);
    refreshAdmin();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function scheduleConsultation(studentId: string, input: SlotInput): Promise<ActionResult<{ eventId: string; prevStage: StudentStage }>> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  const parsed = slotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    const { data: s, error: sErr } = await ctx.db.from("students").select("stage, first_name").eq("id", studentId).single();
    if (sErr) throw sErr;
    const { data: ev, error } = await ctx.db
      .from("events")
      .insert({ ...slotToEvent({ ...parsed.data, weekly: false }), type: "consultation", student_id: studentId, title: `Consultation · ${s.first_name}`, created_by: ctx.viewer.userId })
      .select("id")
      .single();
    if (error) throw error;
    await ctx.db.from("students").update({ stage: "prospect" }).eq("id", studentId);
    refreshAdmin();
    return { ok: true, data: { eventId: ev.id, prevStage: s.stage } };
  } catch (e) {
    return fail(e);
  }
}

export async function setStudentStage(studentId: string, stage: StudentStage): Promise<ActionResult> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  const { error } = await ctx.db.from("students").update({ stage }).eq("id", studentId);
  if (error) return fail(error);
  refreshAdmin();
  return { ok: true };
}

export async function makeIvyUpStudent(
  studentId: string,
  tutorId: string,
  firstSession?: SlotInput,
): Promise<ActionResult<{ prevStage: StudentStage; eventId?: string }>> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  if (!tutorId) return { ok: false, error: "Choose a tutor." };
  try {
    const { data: s, error: sErr } = await ctx.db.from("students").select("stage, first_name").eq("id", studentId).single();
    if (sErr) throw sErr;
    const { error } = await ctx.db.from("students").update({ stage: "active", assigned_tutor_id: tutorId }).eq("id", studentId);
    if (error) throw error;
    let eventId: string | undefined;
    if (firstSession) {
      const parsed = slotSchema.safeParse(firstSession);
      if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
      const { data: ev, error: evErr } = await ctx.db
        .from("events")
        .insert({ ...slotToEvent(parsed.data), type: "session", student_id: studentId, tutor_id: tutorId, title: `Session · ${s.first_name}`, created_by: ctx.viewer.userId })
        .select("id")
        .single();
      if (evErr) throw evErr;
      eventId = ev.id;
    }
    refreshAdmin();
    return { ok: true, data: { prevStage: s.stage, eventId } };
  } catch (e) {
    return fail(e);
  }
}

export async function reassignTutor(studentId: string, tutorId: string): Promise<ActionResult> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  const { error } = await ctx.db.from("students").update({ assigned_tutor_id: tutorId }).eq("id", studentId);
  if (error) return fail(error);
  await ctx.db.from("events").update({ tutor_id: tutorId }).eq("student_id", studentId).eq("type", "session");
  refreshAdmin();
  return { ok: true };
}

const studentSchema = z.object({
  parentName: required("Parent name", 120),
  parentEmail: email("Parent email"),
  parentPhone: required("Parent phone", 40),
  parentSms: z.boolean().default(false),
  firstName: required("Student first name", 60),
  grade: z.enum(GRADES),
  phone: optionalPhone(),
  email: optionalEmail(),
  emailUpdates: z.boolean().default(false),
  textUpdates: z.boolean().default(false),
  subjects: z.array(z.enum(TESTS)).default([]),
  apExams: z.array(z.enum(AP_EXAMS)).default([]),
  preferredTutor: optional(120),
  notes: optional(4000),
  stage: z.enum(["new", "contacted", "prospect", "active"]).default("new"),
  tutorId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
});
export type StudentFormInput = z.input<typeof studentSchema>;

export async function addStudent(input: StudentFormInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  const parsed = studentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;
  if (v.stage === "active" && !v.tutorId) return { ok: false, error: "Choose a tutor for a current student." };
  try {
    const { data: fam, error: fErr } = await ctx.db
      .from("families")
      .insert({ parent_name: v.parentName, parent_email: v.parentEmail, parent_phone: v.parentPhone, parent_sms_opt_in: v.parentSms })
      .select("id")
      .single();
    if (fErr) throw fErr;
    const { data: st, error } = await ctx.db
      .from("students")
      .insert({
        family_id: fam.id,
        first_name: v.firstName,
        grade: v.grade,
        phone: v.phone ?? null,
        email: v.email ?? null,
        email_updates: v.emailUpdates,
        text_updates: v.textUpdates,
        subjects: v.subjects,
        ap_exams: v.subjects.includes("AP exam") ? v.apExams : [],
        preferred_tutor: v.preferredTutor ?? null,
        stage: v.stage,
        assigned_tutor_id: v.stage === "active" ? v.tutorId : null,
        consent_guardian: true,
        consent_contact: true,
        source: "manual",
      })
      .select("id")
      .single();
    if (error) throw error;
    await saveStudentNotes(ctx.db, st.id, v.notes);
    refreshAdmin();
    return { ok: true, data: { id: st.id } };
  } catch (e) {
    return fail(e);
  }
}

async function saveStudentNotes(db: Awaited<ReturnType<typeof createClient>>, studentId: string, notes: string | undefined) {
  const { error } = await db.from("student_notes").upsert({ student_id: studentId, body: notes ?? "" });
  if (error) throw error;
}

async function saveTutorPrivate(db: Awaited<ReturnType<typeof createClient>>, tutorId: string, wage: number, notes: string | null | undefined) {
  const { error } = await db.from("tutor_private").upsert({ tutor_id: tutorId, hourly_wage: wage, notes: notes || null });
  if (error) throw error;
}

export async function updateStudentProfile(
  studentId: string,
  familyId: string | null,
  input: StudentFormInput,
): Promise<ActionResult> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  const parsed = studentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;
  try {
    if (familyId) {
      const { error } = await ctx.db
        .from("families")
        .update({ parent_name: v.parentName, parent_email: v.parentEmail, parent_phone: v.parentPhone, parent_sms_opt_in: v.parentSms })
        .eq("id", familyId);
      if (error) throw error;
    }
    const { error } = await ctx.db
      .from("students")
      .update({
        first_name: v.firstName,
        grade: v.grade,
        phone: v.phone ?? null,
        email: v.email ?? null,
        email_updates: v.emailUpdates,
        text_updates: v.textUpdates,
        subjects: v.subjects,
        ap_exams: v.subjects.includes("AP exam") ? v.apExams : [],
        preferred_tutor: v.preferredTutor ?? null,
      })
      .eq("id", studentId);
    if (error) throw error;
    await saveStudentNotes(ctx.db, studentId, v.notes);
    refreshAdmin();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Calendar events
// ---------------------------------------------------------------------------

export async function createSession(studentId: string, input: SlotInput): Promise<ActionResult<{ eventId: string }>> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  const parsed = slotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { data: s, error: sErr } = await ctx.db.from("students").select("first_name, assigned_tutor_id").eq("id", studentId).single();
  if (sErr) return fail(sErr);
  if (!s.assigned_tutor_id) return { ok: false, error: "Assign a tutor first." };
  const { data, error } = await ctx.db
    .from("events")
    .insert({ ...slotToEvent(parsed.data), type: "session", student_id: studentId, tutor_id: s.assigned_tutor_id, title: `Session · ${s.first_name}`, created_by: ctx.viewer.userId })
    .select("id")
    .single();
  if (error) return fail(error);
  refreshAdmin();
  return { ok: true, data: { eventId: data.id } };
}

export async function updateEvent(eventId: string, input: SlotInput): Promise<ActionResult> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  const parsed = slotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { data: existing } = await ctx.db.from("events").select("type").eq("id", eventId).single();
  const patch = slotToEvent(parsed.data);
  if (existing?.type !== "session") {
    patch.recurrence = "none";
    patch.recurrence_until = null;
  }
  const { error } = await ctx.db.from("events").update(patch).eq("id", eventId);
  if (error) return fail(error);
  refreshAdmin();
  return { ok: true };
}

export async function deleteEvent(eventId: string): Promise<ActionResult> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  const { error } = await ctx.db.from("events").delete().eq("id", eventId);
  if (error) return fail(error);
  refreshAdmin();
  return { ok: true };
}

/** Undo for "Schedule consultation": removes the event and restores the stage. */
export async function undoConsultation(eventId: string, studentId: string, prevStage: StudentStage): Promise<ActionResult> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  await ctx.db.from("events").delete().eq("id", eventId);
  await ctx.db.from("students").update({ stage: prevStage }).eq("id", studentId);
  refreshAdmin();
  return { ok: true };
}

export async function undoMakeStudent(studentId: string, prevStage: StudentStage, eventId?: string): Promise<ActionResult> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  if (eventId) await ctx.db.from("events").delete().eq("id", eventId);
  await ctx.db.from("students").update({ stage: prevStage, assigned_tutor_id: null }).eq("id", studentId);
  refreshAdmin();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Tutor applications
// ---------------------------------------------------------------------------

export async function emailApplicant(applicationId: string, subject: string, body: string): Promise<ActionResult> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  if (!subject.trim() || !body.trim()) return { ok: false, error: "Add a subject and a message." };
  const { data: app, error } = await ctx.db.from("tutor_applications").select("email, stage").eq("id", applicationId).single();
  if (error) return fail(error);
  const sent = await sendEmail({ to: app.email, subject, body, template: "interview_request", link: { applicationId } });
  if (!sent.ok) return sent;
  await ctx.db
    .from("tutor_applications")
    .update({ last_emailed_at: new Date().toISOString(), ...(app.stage === "new" ? { stage: "contacted" } : {}) })
    .eq("id", applicationId);
  refreshAdmin();
  return { ok: true };
}

export async function scheduleInterview(applicationId: string, input: SlotInput): Promise<ActionResult<{ eventId: string; prevStage: ApplicationStage }>> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  const parsed = slotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { data: app, error: aErr } = await ctx.db.from("tutor_applications").select("stage, full_name").eq("id", applicationId).single();
  if (aErr) return fail(aErr);
  const { data: ev, error } = await ctx.db
    .from("events")
    .insert({ ...slotToEvent({ ...parsed.data, weekly: false }), type: "interview", application_id: applicationId, title: `Interview · ${app.full_name}`, created_by: ctx.viewer.userId })
    .select("id")
    .single();
  if (error) return fail(error);
  await ctx.db.from("tutor_applications").update({ stage: "interview_scheduled" }).eq("id", applicationId);
  refreshAdmin();
  return { ok: true, data: { eventId: ev.id, prevStage: app.stage } };
}

export async function setApplicationStage(applicationId: string, stage: ApplicationStage): Promise<ActionResult> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  const { error } = await ctx.db.from("tutor_applications").update({ stage }).eq("id", applicationId);
  if (error) return fail(error);
  refreshAdmin();
  return { ok: true };
}

export async function undoInterview(eventId: string, applicationId: string, prevStage: ApplicationStage): Promise<ActionResult> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  await ctx.db.from("events").delete().eq("id", eventId);
  await ctx.db.from("tutor_applications").update({ stage: prevStage }).eq("id", applicationId);
  refreshAdmin();
  return { ok: true };
}

export async function updateApplicationNotes(applicationId: string, notes: string): Promise<ActionResult> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  const { error } = await ctx.db.from("tutor_applications").update({ owner_notes: notes || null }).eq("id", applicationId);
  if (error) return fail(error);
  return { ok: true };
}

type Credentials = { tutorId: string; username: string; password: string; name: string; email: string | null };

const wageSchema = z.coerce.number({ message: "Enter an hourly wage" }).min(0, "Enter an hourly wage").max(1000);

export async function makeTutor(applicationId: string, wage: number | string, notes?: string): Promise<ActionResult<Credentials>> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  const w = wageSchema.safeParse(wage);
  if (!w.success) return { ok: false, error: w.error.issues[0].message };
  const admin = createAdminClient();
  try {
    const { data: app, error } = await ctx.db.from("tutor_applications").select("*").eq("id", applicationId).single();
    if (error) throw error;
    const { data: tutor, error: tErr } = await admin
      .from("tutors")
      .insert({
        application_id: app.id,
        full_name: app.full_name,
        preferred_name: app.preferred_name,
        email: app.email,
        phone: app.phone,
        school: app.school,
        grad_year: app.year,
        major: app.major,
        sat_score: app.sat_score,
        act_score: app.act_score,
        ap_scores: app.ap_scores,
        bio: app.bio,
      })
      .select("id, full_name")
      .single();
    if (tErr) throw tErr;
    let creds: { username: string; password: string };
    try {
      await saveTutorPrivate(ctx.db, tutor.id, w.data, notes?.trim());
      creds = await createTutorAccount(admin, tutor);
    } catch (e) {
      await admin.from("tutors").delete().eq("id", tutor.id);
      throw e;
    }
    await ctx.db.from("tutor_applications").update({ stage: "hired" }).eq("id", applicationId);
    refreshAdmin();
    return { ok: true, data: { tutorId: tutor.id, name: tutor.full_name, email: app.email, ...creds } };
  } catch (e) {
    return fail(e, "Couldn't create the tutor. Try again.");
  }
}

const manualTutorSchema = z.object({
  fullName: required("Name", 120),
  email: optionalEmail(),
  phone: optional(40),
  school: optional(120),
  gradYear: optional(20),
  major: optional(120),
  wage: wageSchema,
  notes: optional(4000),
});
export type ManualTutorInput = z.input<typeof manualTutorSchema>;

export async function addTutor(input: ManualTutorInput): Promise<ActionResult<Credentials>> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  const parsed = manualTutorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;
  const admin = createAdminClient();
  try {
    const { data: tutor, error } = await admin
      .from("tutors")
      .insert({
        full_name: v.fullName,
        email: v.email ?? null,
        phone: v.phone ?? null,
        school: v.school ?? null,
        grad_year: v.gradYear ?? null,
        major: v.major ?? null,
      })
      .select("id, full_name")
      .single();
    if (error) throw error;
    let creds: { username: string; password: string };
    try {
      await saveTutorPrivate(ctx.db, tutor.id, v.wage, v.notes);
      creds = await createTutorAccount(admin, tutor);
    } catch (e) {
      await admin.from("tutors").delete().eq("id", tutor.id);
      throw e;
    }
    refreshAdmin();
    return { ok: true, data: { tutorId: tutor.id, name: tutor.full_name, email: v.email ?? null, ...creds } };
  } catch (e) {
    return fail(e, "Couldn't create the tutor. Try again.");
  }
}

export async function resetPasswordForTutor(tutorId: string): Promise<ActionResult<Credentials>> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  const admin = createAdminClient();
  try {
    const { data: t, error } = await ctx.db.from("tutors").select("id, user_id, username, full_name, email").eq("id", tutorId).single();
    if (error) throw error;
    if (!t.user_id || !t.username) {
      const creds = await createTutorAccount(admin, t);
      refreshAdmin();
      return { ok: true, data: { tutorId: t.id, name: t.full_name, email: t.email, ...creds } };
    }
    const password = await resetTutorPassword(admin, t.user_id);
    return { ok: true, data: { tutorId: t.id, name: t.full_name, email: t.email, username: t.username, password } };
  } catch (e) {
    return fail(e);
  }
}

export async function emailTutorLogin(tutorId: string, password: string, toOverride?: string): Promise<ActionResult> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  const { data: t, error } = await ctx.db.from("tutors").select("full_name, email, username").eq("id", tutorId).single();
  if (error) return fail(error);
  const to = toOverride || t.email;
  if (!to) return { ok: false, error: "This tutor has no email on file." };
  if (!t.username) return { ok: false, error: "This tutor has no login yet." };
  const sent = await sendEmail({ to, template: "tutor_login", link: { tutorId }, ...tutorLogin({ name: t.full_name, username: t.username, password }) });
  return sent.ok ? { ok: true } : sent;
}

const tutorUpdateSchema = z.object({
  fullName: required("Name", 120),
  email: optionalEmail(),
  phone: optional(40),
  school: optional(120),
  gradYear: optional(20),
  major: optional(120),
  wage: wageSchema,
  notes: optional(4000),
});

export async function updateTutor(tutorId: string, input: z.input<typeof tutorUpdateSchema>): Promise<ActionResult> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  const parsed = tutorUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;
  const { error } = await ctx.db
    .from("tutors")
    .update({
      full_name: v.fullName,
      email: v.email ?? null,
      phone: v.phone ?? null,
      school: v.school ?? null,
      grad_year: v.gradYear ?? null,
      major: v.major ?? null,
    })
    .eq("id", tutorId);
  if (error) return fail(error);
  try {
    await saveTutorPrivate(ctx.db, tutorId, v.wage, v.notes);
  } catch (e) {
    return fail(e);
  }
  refreshAdmin();
  return { ok: true };
}

export async function setTutorActive(tutorId: string, active: boolean): Promise<ActionResult> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  const { data: t, error } = await ctx.db.from("tutors").update({ active }).eq("id", tutorId).select("user_id").single();
  if (error) return fail(error);
  if (t.user_id) {
    try {
      await setTutorLoginEnabled(createAdminClient(), t.user_id, active);
    } catch (e) {
      return fail(e);
    }
  }
  refreshAdmin();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Public displays and testimonials
// ---------------------------------------------------------------------------

function refreshPublic() {
  revalidatePath("/");
  revalidatePath("/tutors");
  refreshAdmin();
}

const displaySchema = z.object({
  id: z.string().uuid().optional(),
  tutorId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  name: required("Name", 120),
  title: required("Title", 80),
  school: optional(120),
  description: required("Description", 1200),
  funFact: optional(300),
  photoPath: optional(300),
  photoBlurhash: optional(100),
  status: z.enum(["draft", "posted"]),
});
export type DisplayInput = z.input<typeof displaySchema>;

export async function saveDisplay(input: DisplayInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  const parsed = displaySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;
  const row = {
    tutor_id: v.tutorId ?? null,
    name: v.name,
    title: v.title,
    school: v.school ?? null,
    description: v.description,
    fun_fact: v.funFact ?? null,
    photo_path: v.photoPath ?? null,
    photo_blurhash: v.photoBlurhash ?? null,
    status: v.status,
  };
  if (v.id) {
    const { error } = await ctx.db.from("tutor_displays").update(row).eq("id", v.id);
    if (error) return fail(error);
    refreshPublic();
    return { ok: true, data: { id: v.id } };
  }
  const { count } = await ctx.db.from("tutor_displays").select("id", { count: "exact", head: true });
  const { data, error } = await ctx.db.from("tutor_displays").insert({ ...row, sort_order: count ?? 0 }).select("id").single();
  if (error) return fail(error);
  refreshPublic();
  return { ok: true, data: { id: data.id } };
}

export async function setDisplayStatus(id: string, status: "draft" | "posted"): Promise<ActionResult> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  const { error } = await ctx.db.from("tutor_displays").update({ status }).eq("id", id);
  if (error) return fail(error);
  refreshPublic();
  return { ok: true };
}

export async function deleteDisplay(id: string): Promise<ActionResult> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  const { data } = await ctx.db.from("tutor_displays").select("photo_path").eq("id", id).single();
  const { error } = await ctx.db.from("tutor_displays").delete().eq("id", id);
  if (error) return fail(error);
  if (data?.photo_path) await ctx.db.storage.from("tutor-photos").remove([data.photo_path]);
  refreshPublic();
  return { ok: true };
}

export async function reorder(table: "tutor_displays" | "testimonials", ids: string[]): Promise<ActionResult> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  try {
    await Promise.all(
      ids.map((id, i) =>
        ctx.db
          .from(table)
          .update({ sort_order: i })
          .eq("id", id)
          .then(({ error }) => {
            if (error) throw error;
          }),
      ),
    );
    refreshPublic();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

const testimonialSchema = z
  .object({
    id: z.string().uuid().optional(),
    resultType: z.enum(["sat", "act", "psat", "ap", "other"]),
    scoreFrom: z.coerce.number().int().min(0).max(1600).optional().or(z.literal("").transform(() => undefined)),
    scoreTo: z.coerce.number().int().min(0).max(1600).optional().or(z.literal("").transform(() => undefined)),
    apExam: optional(120),
    apScore: z.coerce.number().int().min(1).max(5).optional().or(z.literal("").transform(() => undefined)),
    resultText: optional(160),
    quote: required("Testimonial", 2000),
    attributionName: required("Name", 120),
    attributionRole: z.enum(["parent", "student"]),
    tutorName: optional(120),
    status: z.enum(["draft", "posted"]),
  })
  .superRefine((v, ctx) => {
    if (v.resultType === "ap" && (!v.apExam || !v.apScore)) {
      ctx.addIssue({ code: "custom", path: ["apExam"], message: "Choose the AP exam and score" });
    }
    if (v.resultType === "other" && !v.resultText) {
      ctx.addIssue({ code: "custom", path: ["resultText"], message: "Describe the result" });
    }
  });
export type TestimonialInput = z.input<typeof testimonialSchema>;

export async function saveTestimonial(input: TestimonialInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  const parsed = testimonialSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;
  const isScore = v.resultType === "sat" || v.resultType === "act" || v.resultType === "psat";
  const row = {
    result_type: v.resultType,
    score_from: isScore ? (v.scoreFrom ?? null) : null,
    score_to: isScore ? (v.scoreTo ?? null) : null,
    ap_exam: v.resultType === "ap" ? (v.apExam ?? null) : null,
    ap_score: v.resultType === "ap" ? (v.apScore ?? null) : null,
    result_text: v.resultText ?? null,
    quote: v.quote,
    attribution_name: v.attributionName,
    attribution_role: v.attributionRole,
    tutor_name: v.tutorName ?? null,
    status: v.status,
  };
  if (v.id) {
    const { error } = await ctx.db.from("testimonials").update(row).eq("id", v.id);
    if (error) return fail(error);
    refreshPublic();
    return { ok: true, data: { id: v.id } };
  }
  const { data, error } = await ctx.db.from("testimonials").insert({ ...row, sort_order: 0 }).select("id").single();
  if (error) return fail(error);
  refreshPublic();
  return { ok: true, data: { id: data.id } };
}

export async function setTestimonialStatus(id: string, status: "draft" | "posted"): Promise<ActionResult> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  const { error } = await ctx.db.from("testimonials").update({ status }).eq("id", id);
  if (error) return fail(error);
  refreshPublic();
  return { ok: true };
}

export async function deleteTestimonial(id: string): Promise<ActionResult> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  const { error } = await ctx.db.from("testimonials").delete().eq("id", id);
  if (error) return fail(error);
  refreshPublic();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Inbox
// ---------------------------------------------------------------------------

export async function setMessageRead(id: string, read: boolean): Promise<ActionResult> {
  const ctx = await ownerDb();
  if (!ctx) return DENIED;
  const { error } = await ctx.db.from("contact_messages").update({ read_at: read ? new Date().toISOString() : null }).eq("id", id);
  if (error) return fail(error);
  refreshAdmin();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export async function signOut() {
  const db = await createClient();
  await db.auth.signOut();
  redirect("/admin/login");
}

// ---------------------------------------------------------------------------
// Detail loaders used by profile sheets
// ---------------------------------------------------------------------------

export async function loadStudentDetail(studentId: string) {
  const { getStudentDetail } = await import("@/lib/admin-data");
  return getStudentDetail(studentId);
}
