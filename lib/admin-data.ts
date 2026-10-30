import "server-only";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { expandOccurrences, shiftDate, todayEt } from "@/lib/time";
import type {
  CalendarEvent,
  ContactMessage,
  EmailLog,
  Homework,
  SessionNote,
  StudentWithFamily,
  Testimonial,
  Tutor,
  TutorApplication,
  TutorDisplay,
} from "@/lib/types";

async function db() {
  await requireOwner();
  return createClient();
}

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`Couldn't load ${what}: ${res.error.message}`);
  return (res.data ?? []) as T;
}

type One<T> = T | T[] | null;
const one = <T,>(v: One<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

/** Owner view of a student: the private notes live in student_notes. */
export function withStudentNotes<T extends { private?: One<{ body: string }> }>(rows: T[]) {
  return rows.map(({ private: p, ...rest }) => ({ ...rest, owner_notes: one(p ?? null)?.body || null }));
}

/** Owner view of a tutor: wage and notes live in tutor_private. */
export function withTutorPrivate<T extends { private?: One<{ hourly_wage: number | null; notes: string | null }> }>(rows: T[]) {
  return rows.map(({ private: p, ...rest }) => {
    const priv = one(p ?? null);
    return { ...rest, hourly_wage: priv?.hourly_wage ?? null, notes: priv?.notes ?? null };
  });
}

export async function getStudents() {
  const d = await db();
  const rows = must<(StudentWithFamily & { private?: One<{ body: string }> })[]>(
    await d.from("students").select("*, family:families(*), private:student_notes(body)").order("created_at", { ascending: false }),
    "students",
  );
  return withStudentNotes(rows) as StudentWithFamily[];
}

export async function getTutors() {
  const d = await db();
  const rows = must<(Tutor & { private?: One<{ hourly_wage: number | null; notes: string | null }> })[]>(
    await d.from("tutors").select("*, private:tutor_private(hourly_wage, notes)").order("full_name"),
    "tutors",
  );
  return withTutorPrivate(rows) as Tutor[];
}

export async function getApplications() {
  const d = await db();
  return must<TutorApplication[]>(
    await d.from("tutor_applications").select("*").order("created_at", { ascending: false }),
    "applications",
  );
}

export async function getEvents() {
  const d = await db();
  return must<CalendarEvent[]>(await d.from("events").select("*").order("starts_at"), "events");
}

/** Next upcoming occurrence per student / application, for card summaries. */
export function nextOccurrences(events: CalendarEvent[]) {
  const today = todayEt();
  const upcoming = expandOccurrences(events, today, shiftDate(today, 120)).filter(
    (o) => new Date(o.ends_at).getTime() >= Date.now() - 60 * 60 * 1000,
  );
  const byStudent: Record<string, (typeof upcoming)[number]> = {};
  const byApplication: Record<string, (typeof upcoming)[number]> = {};
  for (const o of upcoming) {
    if (o.event.student_id && !byStudent[`${o.event.type}:${o.event.student_id}`]) byStudent[`${o.event.type}:${o.event.student_id}`] = o;
    if (o.event.application_id && !byApplication[o.event.application_id]) byApplication[o.event.application_id] = o;
  }
  return { byStudent, byApplication };
}

export async function getStudentDetail(studentId: string) {
  const d = await db();
  const [emails, homework, notes] = await Promise.all([
    d.from("email_log").select("*").eq("student_id", studentId).order("sent_at", { ascending: false }),
    d.from("homework").select("*").eq("student_id", studentId).order("due_date", { ascending: false }),
    d
      .from("session_notes")
      .select("*, event:events!inner(student_id)")
      .eq("event.student_id", studentId)
      .order("occurrence_date", { ascending: false }),
  ]);
  return {
    emails: must<EmailLog[]>(emails, "emails"),
    homework: must<Homework[]>(homework, "homework"),
    notes: must<SessionNote[]>(notes, "notes"),
  };
}

export async function getDisplays() {
  const d = await db();
  return must<TutorDisplay[]>(await d.from("tutor_displays").select("*").order("sort_order").order("created_at"), "displays");
}

export async function getTestimonials() {
  const d = await db();
  return must<Testimonial[]>(
    await d.from("testimonials").select("*").order("sort_order").order("created_at", { ascending: false }),
    "testimonials",
  );
}

export async function getMessages() {
  const d = await db();
  return must<ContactMessage[]>(await d.from("contact_messages").select("*").order("created_at", { ascending: false }), "messages");
}

export async function getSidebarCounts() {
  const d = await db();
  const [newForms, newApps, unread] = await Promise.all([
    d.from("students").select("id", { count: "exact", head: true }).eq("stage", "new"),
    d.from("tutor_applications").select("id", { count: "exact", head: true }).eq("stage", "new"),
    d.from("contact_messages").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);
  return { newForms: newForms.count ?? 0, newApps: newApps.count ?? 0, unread: unread.count ?? 0 };
}

export async function getSearchIndex() {
  const d = await db();
  const [students, tutors, apps] = await Promise.all([
    d.from("students").select("id, first_name, grade, stage, family:families(parent_name)").neq("stage", "archived"),
    d.from("tutors").select("id, full_name, school"),
    d.from("tutor_applications").select("id, full_name, school, stage").in("stage", ["new", "contacted", "interview_scheduled"]),
  ]);
  return {
    students: (students.data ?? []).map((s) => ({
      id: s.id as string,
      label: `${s.first_name} · ${s.grade}`,
      sub: ((s.family as unknown as { parent_name: string } | null)?.parent_name ?? "") as string,
      stage: s.stage as string,
    })),
    tutors: (tutors.data ?? []).map((t) => ({ id: t.id as string, label: t.full_name as string, sub: (t.school ?? "") as string })),
    applications: (apps.data ?? []).map((a) => ({ id: a.id as string, label: a.full_name as string, sub: (a.school ?? "") as string })),
  };
}
