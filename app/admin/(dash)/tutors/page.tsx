import type { Metadata } from "next";
import { Suspense } from "react";
import { TutorsBoard } from "@/components/admin/tutors-board";
import { getApplications, getEvents, getStudents, getTutors, nextOccurrences } from "@/lib/admin-data";
import { expandOccurrences, shiftDate, todayEt } from "@/lib/time";

export const metadata: Metadata = { title: "Tutors" };

export default async function TutorsPage() {
  const [applications, tutors, students, events] = await Promise.all([getApplications(), getTutors(), getStudents(), getEvents()]);
  const { byApplication } = nextOccurrences(events);
  const today = todayEt();
  const upcoming = expandOccurrences(events.filter((e) => e.type === "session"), today, shiftDate(today, 21)).filter(
    (o) => new Date(o.starts_at) > new Date(),
  );
  const rows = tutors
    .map((t) => ({
      ...t,
      studentCount: students.filter((s) => s.stage === "active" && s.assigned_tutor_id === t.id).length,
      nextSession: upcoming.find((o) => o.event.tutor_id === t.id)?.starts_at,
    }))
    .sort((a, b) => Number(b.active) - Number(a.active) || a.full_name.localeCompare(b.full_name));
  return (
    <Suspense>
      <TutorsBoard applications={applications} tutors={rows} interviews={byApplication} />
    </Suspense>
  );
}
