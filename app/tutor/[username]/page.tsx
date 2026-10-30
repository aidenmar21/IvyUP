import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TutorPortal } from "@/components/tutor/tutor-portal";
import { requireTutor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CalendarEvent, Homework, SessionNote, StudentWithFamily, Tutor } from "@/lib/types";

export const metadata: Metadata = { title: "My students", robots: { index: false } };

export default async function TutorHome({ params }: PageProps<"/tutor/[username]">) {
  const viewer = await requireTutor();
  const { username } = await params;
  // Each tutor has exactly one page; any other username goes back to theirs.
  if (decodeURIComponent(username) !== viewer.username) redirect(`/tutor/${viewer.username}`);

  const db = await createClient();
  // Row Level Security limits every query below to this tutor's own students.
  const [{ data: tutor }, { data: students }, { data: events }, { data: homework }, { data: notes }] = await Promise.all([
    db.from("tutors").select("*").eq("id", viewer.tutorId).single<Tutor>(),
    db.from("students").select("*, family:families(*)").eq("stage", "active").order("first_name"),
    db.from("events").select("*").eq("type", "session").order("starts_at"),
    db.from("homework").select("*").order("due_date"),
    db.from("session_notes").select("*").order("occurrence_date", { ascending: false }),
  ]);

  return (
    <TutorPortal
      tutor={tutor!}
      students={(students ?? []) as StudentWithFamily[]}
      events={(events ?? []) as CalendarEvent[]}
      homework={(homework ?? []) as Homework[]}
      notes={(notes ?? []) as SessionNote[]}
    />
  );
}
