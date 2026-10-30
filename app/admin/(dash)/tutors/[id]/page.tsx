import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TutorDetail } from "@/components/admin/tutor-detail";
import { requireOwner } from "@/lib/auth";
import { withTutorPrivate } from "@/lib/admin-data";
import { createClient } from "@/lib/supabase/server";
import { expandOccurrences, shiftDate, todayEt } from "@/lib/time";
import type { CalendarEvent, StudentWithFamily, Tutor, TutorApplication } from "@/lib/types";

export const metadata: Metadata = { title: "Tutor" };

export default async function TutorPage({ params }: PageProps<"/admin/tutors/[id]">) {
  await requireOwner();
  const { id } = await params;
  const db = await createClient();
  const { data: row } = await db.from("tutors").select("*, private:tutor_private(hourly_wage, notes)").eq("id", id).maybeSingle();
  if (!row) notFound();
  const [tutor] = withTutorPrivate([row]) as Tutor[];
  const [{ data: students }, { data: events }, { data: app }] = await Promise.all([
    db.from("students").select("*, family:families(*)").eq("assigned_tutor_id", id).eq("stage", "active").order("first_name"),
    db.from("events").select("*").eq("tutor_id", id).eq("type", "session").order("starts_at"),
    tutor.application_id
      ? db.from("tutor_applications").select("*").eq("id", tutor.application_id).maybeSingle<TutorApplication>()
      : Promise.resolve({ data: null }),
  ]);
  const today = todayEt();
  const occurrences = expandOccurrences((events ?? []) as CalendarEvent[], today, shiftDate(today, 27)).filter(
    (o) => new Date(o.ends_at) > new Date(),
  );
  return (
    <TutorDetail
      tutor={tutor}
      application={app as TutorApplication | null}
      students={(students ?? []) as StudentWithFamily[]}
      events={(events ?? []) as CalendarEvent[]}
      occurrences={occurrences}
    />
  );
}
