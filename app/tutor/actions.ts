"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { tutorOrNull } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { etToUtc } from "@/lib/time";
import type { ActionResult, Homework, SessionNote } from "@/lib/types";

const DENIED = { ok: false as const, error: "Your session ended. Sign in again." };
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

async function ctx() {
  const viewer = await tutorOrNull();
  if (!viewer) return null;
  return { viewer, db: await createClient() };
}

function refresh() {
  revalidatePath("/tutor", "layout");
  revalidatePath("/admin", "layout");
}

export async function addHomework(studentId: string, description: string, dueDate: string): Promise<ActionResult<Homework>> {
  const c = await ctx();
  if (!c) return DENIED;
  const d = date.safeParse(dueDate);
  if (!description.trim()) return { ok: false, error: "Describe the homework." };
  if (!d.success) return { ok: false, error: "Pick a due date." };
  const { data, error } = await c.db
    .from("homework")
    .insert({ student_id: studentId, tutor_id: c.viewer.tutorId, description: description.trim().slice(0, 1000), due_date: d.data })
    .select("*")
    .single();
  if (error) return { ok: false, error: "Couldn't save the homework. Is this your student?" };
  refresh();
  return { ok: true, data: data as Homework };
}

export async function setHomeworkDone(id: string, done: boolean): Promise<ActionResult> {
  const c = await ctx();
  if (!c) return DENIED;
  const { error } = await c.db.from("homework").update({ done }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function deleteHomework(id: string): Promise<ActionResult> {
  const c = await ctx();
  if (!c) return DENIED;
  const { error } = await c.db.from("homework").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function saveSessionNote(eventId: string, occurrenceDate: string, body: string): Promise<ActionResult<SessionNote>> {
  const c = await ctx();
  if (!c) return DENIED;
  const d = date.safeParse(occurrenceDate);
  if (!d.success) return { ok: false, error: "Invalid session date." };
  const { data, error } = await c.db
    .from("session_notes")
    .upsert(
      { event_id: eventId, occurrence_date: d.data, tutor_id: c.viewer.tutorId, body: body.slice(0, 10000) },
      { onConflict: "event_id,occurrence_date" },
    )
    .select("*")
    .single();
  if (error) return { ok: false, error: "Couldn't save your notes." };
  return { ok: true, data: data as SessionNote };
}

const slot = z.object({
  date,
  time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a time"),
  durationMin: z.coerce.number().int().min(15).max(240),
  zoomLink: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
  weekly: z.boolean().optional(),
  until: z.string().optional(),
});
export type TutorSlot = z.input<typeof slot>;

function toRow(v: z.output<typeof slot>) {
  const starts = etToUtc(v.date, v.time);
  return {
    starts_at: starts,
    ends_at: new Date(new Date(starts).getTime() + v.durationMin * 60_000).toISOString(),
    zoom_link: v.zoomLink || null,
    notes: v.notes || null,
    recurrence: v.weekly ? "weekly" : "none",
    recurrence_until: v.weekly && v.until ? v.until : null,
  };
}

export async function createTutorSession(studentId: string, input: TutorSlot): Promise<ActionResult> {
  const c = await ctx();
  if (!c) return DENIED;
  const p = slot.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const { data: s } = await c.db.from("students").select("first_name").eq("id", studentId).maybeSingle();
  if (!s) return { ok: false, error: "That student isn't assigned to you." };
  const { error } = await c.db
    .from("events")
    .insert({ ...toRow(p.data), type: "session", student_id: studentId, tutor_id: c.viewer.tutorId, title: `Session · ${s.first_name}`, created_by: c.viewer.userId });
  if (error) return { ok: false, error: "Couldn't add the session." };
  refresh();
  return { ok: true };
}

export async function updateTutorSession(eventId: string, input: TutorSlot): Promise<ActionResult> {
  const c = await ctx();
  if (!c) return DENIED;
  const p = slot.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const { error } = await c.db.from("events").update(toRow(p.data)).eq("id", eventId);
  if (error) return { ok: false, error: "Couldn't update the session." };
  refresh();
  return { ok: true };
}

export async function deleteTutorSession(eventId: string): Promise<ActionResult> {
  const c = await ctx();
  if (!c) return DENIED;
  const { error } = await c.db.from("events").delete().eq("id", eventId);
  if (error) return { ok: false, error: "Couldn't delete the session." };
  refresh();
  return { ok: true };
}
