import type { Metadata } from "next";
import { Suspense } from "react";
import { ProspectsBoard } from "@/components/admin/prospects-board";
import { getEvents, getStudents, getTutors, nextOccurrences } from "@/lib/admin-data";

export const metadata: Metadata = { title: "Prospects" };

export default async function ProspectsPage() {
  const [students, tutors, events] = await Promise.all([getStudents(), getTutors(), getEvents()]);
  const { byStudent } = nextOccurrences(events);
  return (
    <Suspense>
      <ProspectsBoard students={students} tutors={tutors} next={byStudent} />
    </Suspense>
  );
}
