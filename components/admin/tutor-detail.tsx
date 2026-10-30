"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeft, KeyRound, Power, Repeat } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field } from "@/components/shared/form-bits";
import { Chip, DetailRow, EmailLine, EmptyState, PhoneLine, PrefIcons } from "@/components/admin/ui";
import { CredentialsDialog, type Credentials } from "@/components/admin/dialogs";
import { ApplicationDetails } from "@/components/admin/application-details";
import { resetPasswordForTutor, setTutorActive, updateTutor } from "@/app/admin/actions";
import { fmt, fmtRange } from "@/lib/time";
import type { CalendarEvent, Occurrence, StudentWithFamily, Tutor, TutorApplication } from "@/lib/types";

export function TutorDetail({
  tutor,
  application,
  students,
  events,
  occurrences,
}: {
  tutor: Tutor;
  application: TutorApplication | null;
  students: StudentWithFamily[];
  events: CalendarEvent[];
  occurrences: Occurrence[];
}) {
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [pending, start] = useTransition();
  const studentName = (id: string | null) => students.find((s) => s.id === id)?.first_name ?? "Student";

  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-4 px-4 pt-8 pb-6 sm:px-8 lg:pt-12">
        <Link href="/admin/tutors?tab=current" className="flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-ink-600 hover:text-ink-900">
          <ArrowLeft className="size-4" /> All tutors
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="flex flex-wrap items-baseline gap-x-4 font-display text-4xl text-ink-900">
              {tutor.full_name}
              {!tutor.active && <Chip>Inactive</Chip>}
            </h1>
            <p className="eyebrow text-brass-700">{[tutor.school, tutor.grad_year].filter(Boolean).join(" · ") || "School not set"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await resetPasswordForTutor(tutor.id);
                  if (!r.ok) return void toast.error(r.error);
                  setCreds(r.data);
                })
              }
            >
              <KeyRound /> {tutor.user_id ? "Reset password" : "Create login"}
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  if (tutor.active && !window.confirm(`Deactivate ${tutor.full_name}? They won't be able to sign in.`)) return;
                  const r = await setTutorActive(tutor.id, !tutor.active);
                  if (!r.ok) return void toast.error(r.error);
                  toast.success(tutor.active ? "Tutor deactivated" : "Tutor reactivated");
                })
              }
            >
              <Power /> {tutor.active ? "Deactivate" : "Reactivate"}
            </Button>
          </div>
        </div>
      </header>

      <Tabs defaultValue="students" className="gap-0">
        <div className="sticky top-14 z-20 border-b border-line bg-paper/95 px-4 backdrop-blur-md sm:px-8 lg:top-0">
          <TabsList variant="line" className="h-12 justify-start gap-8">
            <TabsTrigger value="students" className="h-12 flex-none px-0 text-base">
              Students & schedule
            </TabsTrigger>
            <TabsTrigger value="profile" className="h-12 flex-none px-0 text-base">
              Profile
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="students" className="px-4 py-6 animate-in fade-in duration-200 sm:px-8">
          <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
            <section className="flex flex-col gap-4">
              <h2 className="eyebrow text-ink-600">Current students ({students.length})</h2>
              {students.length === 0 ? (
                <EmptyState title="No students assigned" body="Assign this tutor when you mark a prospect as an IvyUp student." />
              ) : (
                <ul className="flex flex-col gap-4">
                  {students.map((s) => {
                    const series = events.filter((e) => e.student_id === s.id);
                    return (
                      <li key={s.id} className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                          <Link href={`/admin/prospects?student=${s.id}`} className="font-display text-2xl text-ink-900 hover:text-ivy-700">
                            {s.first_name} <span className="font-sans text-base text-ink-600">· {s.grade}</span>
                          </Link>
                          <PrefIcons parentText={!!s.family?.parent_sms_opt_in} studentEmail={s.email_updates} studentText={s.text_updates} />
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {[...s.subjects.filter((x) => x !== "AP exam"), ...s.ap_exams].map((x) => (
                            <Chip key={x} tone={x.startsWith("AP ") ? "brass" : "ivy"}>
                              {x}
                            </Chip>
                          ))}
                        </div>
                        <ul className="flex flex-col gap-1 text-sm">
                          {series.length === 0 ? (
                            <li className="text-ink-600">No sessions scheduled.</li>
                          ) : (
                            series.map((e) => (
                              <li key={e.id} className="flex items-center gap-2 text-ink-900 tabular">
                                {e.recurrence === "weekly" ? <Repeat className="size-3.5 text-ivy-700" /> : <span className="size-3.5" />}
                                {e.recurrence === "weekly" ? `Every ${fmt(e.starts_at, "EEEE")}` : fmt(e.starts_at, "EEE, MMM d")} · {fmtRange(e.starts_at, e.ends_at)} ET
                              </li>
                            ))
                          )}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
            <section className="flex flex-col gap-4">
              <h2 className="eyebrow text-ink-600">Next four weeks</h2>
              {occurrences.length === 0 ? (
                <p className="text-sm text-ink-600">No upcoming sessions.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
                  {occurrences.map((o) => (
                    <li key={o.key} className="flex min-h-14 items-center justify-between gap-4 px-4 py-2 text-sm">
                      <span className="font-semibold text-ink-900">{studentName(o.event.student_id)}</span>
                      <span className="text-ink-600 tabular">
                        {fmt(o.starts_at, "EEE MMM d")} · {fmtRange(o.starts_at, o.ends_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </TabsContent>

        <TabsContent value="profile" className="px-4 py-6 animate-in fade-in duration-200 sm:px-8">
          <div className="grid gap-12 xl:grid-cols-[1fr_1fr]">
            <section className="flex flex-col gap-6">
              <h2 className="eyebrow text-ink-600">At a glance</h2>
              <dl>
                <DetailRow label="Phone">{tutor.phone ? <PhoneLine phone={tutor.phone} /> : null}</DetailRow>
                <DetailRow label="Email">{tutor.email ? <EmailLine email={tutor.email} /> : null}</DetailRow>
                <DetailRow label="Major">{tutor.major}</DetailRow>
                <DetailRow label="SAT">{tutor.sat_score}</DetailRow>
                <DetailRow label="ACT">{tutor.act_score}</DetailRow>
                <DetailRow label="AP scores">{tutor.ap_scores}</DetailRow>
                <DetailRow label="Username">{tutor.username ? <span className="font-mono">{tutor.username}</span> : "No login yet"}</DetailRow>
                <DetailRow label="Tutor since">{fmt(tutor.created_at, "MMMM d, yyyy")}</DetailRow>
              </dl>
              {tutor.bio && (
                <div className="flex flex-col gap-2">
                  <h3 className="eyebrow text-ink-600">Bio</h3>
                  <p className="measure whitespace-pre-wrap text-ink-900">{tutor.bio}</p>
                </div>
              )}
              <EditTutor tutor={tutor} />
            </section>
            <section className="flex flex-col gap-6">
              <h2 className="eyebrow text-ink-600">Application</h2>
              {application ? <ApplicationDetails app={application} /> : <p className="text-sm text-ink-600">Added directly by you, so there&apos;s no application on file.</p>}
            </section>
          </div>
        </TabsContent>
      </Tabs>

      <CredentialsDialog creds={creds} onClose={() => setCreds(null)} />
    </div>
  );
}

function EditTutor({ tutor }: { tutor: Tutor }) {
  const [v, setV] = useState({
    fullName: tutor.full_name,
    email: tutor.email ?? "",
    phone: tutor.phone ?? "",
    school: tutor.school ?? "",
    gradYear: tutor.grad_year ?? "",
    major: tutor.major ?? "",
    wage: tutor.hourly_wage != null ? String(tutor.hourly_wage) : "",
    notes: tutor.notes ?? "",
  });
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v, x: string) => setV((p) => ({ ...p, [k]: x }));
  return (
    <form
      className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateTutor(tutor.id, v);
          if (r.ok) toast.success("Saved");
          else toast.error(r.error);
        });
      }}
    >
      <h3 className="font-display text-xl text-ink-900">Details and pay</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="et-name">
          <Input id="et-name" value={v.fullName} onChange={(e) => set("fullName", e.target.value)} />
        </Field>
        <Field label="Hourly wage" htmlFor="et-wage" hint="Private">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ink-600">$</span>
            <Input id="et-wage" inputMode="decimal" className="pl-8 tabular" value={v.wage} onChange={(e) => set("wage", e.target.value)} />
          </div>
        </Field>
        <Field label="Email" htmlFor="et-email" optional>
          <Input id="et-email" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Phone" htmlFor="et-phone" optional>
          <Input id="et-phone" type="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="School" htmlFor="et-school" optional>
          <Input id="et-school" value={v.school} onChange={(e) => set("school", e.target.value)} />
        </Field>
        <Field label="Year" htmlFor="et-year" optional>
          <Input id="et-year" value={v.gradYear} onChange={(e) => set("gradYear", e.target.value)} />
        </Field>
        <Field label="Major" htmlFor="et-major" optional className="sm:col-span-2">
          <Input id="et-major" value={v.major} onChange={(e) => set("major", e.target.value)} />
        </Field>
        <Field label="Notes" htmlFor="et-notes" optional className="sm:col-span-2">
          <Textarea id="et-notes" rows={4} value={v.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </div>
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
