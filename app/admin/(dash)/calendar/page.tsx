import type { Metadata } from "next";
import { CalendarView, type CalendarPeople } from "@/components/admin/calendar-view";
import { PageHeader } from "@/components/admin/ui";
import { getApplications, getEvents, getStudents, getTutors } from "@/lib/admin-data";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const [events, students, applications, tutors] = await Promise.all([getEvents(), getStudents(), getApplications(), getTutors()]);
  const people: CalendarPeople = {
    students: Object.fromEntries(students.map((s) => [s.id, s])),
    applications: Object.fromEntries(
      applications.map((a) => [a.id, { id: a.id, full_name: a.full_name, email: a.email, phone: a.phone, school: a.school, year: a.year }]),
    ),
    tutors: Object.fromEntries(tutors.map((t) => [t.id, { id: t.id, full_name: t.full_name }])),
  };
  return (
    <>
      <PageHeader title="Calendar" description="Consultations, interviews, and every tutoring session. Times are Eastern." />
      <CalendarView events={events} people={people} />
    </>
  );
}
