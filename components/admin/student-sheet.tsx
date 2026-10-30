"use client";

import { useEffect, useState, useTransition } from "react";
import { Archive, ArchiveRestore, CalendarClock, CalendarPlus, Mail, MessageSquareText, Pencil, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/shared/form-bits";
import { Chip, DetailRow, EmailLine, PhoneLine, PrefIcons } from "@/components/admin/ui";
import { EmailDialog, SlotDialog, TutorSelect } from "@/components/admin/dialogs";
import { StudentForm, studentToForm } from "@/components/admin/student-form";
import { ConvertDialog } from "@/components/admin/convert-dialog";
import {
  createSession,
  emailParent,
  loadStudentDetail,
  reassignTutor,
  scheduleConsultation,
  setStudentStage,
  updateStudentProfile,
} from "@/app/admin/actions";
import { consultationRequest } from "@/lib/email/templates";
import { smsHref, subjectsLabel } from "@/lib/format";
import { fmt, fmtWhen } from "@/lib/time";
import type { EmailLog, Homework, Occurrence, SessionNote, StudentStage, StudentWithFamily, Tutor } from "@/lib/types";

const STAGE_LABEL: Record<StudentStage, string> = {
  new: "Form response",
  contacted: "Form response · emailed",
  prospect: "Potential prospect",
  active: "Current student",
  archived: "Archived",
};

type Detail = { emails: EmailLog[]; homework: Homework[]; notes: SessionNote[] };

export function StudentSheet({
  student: s,
  tutors,
  nextConsult,
  nextSession,
  onClose,
  onMoved,
}: {
  student: StudentWithFamily | null;
  tutors: Tutor[];
  nextConsult?: Occurrence;
  nextSession?: Occurrence;
  onClose: () => void;
  onMoved: (stage: StudentStage) => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState<null | "email" | "consult" | "session" | "convert" | "reassign">(null);
  const [, start] = useTransition();
  const id = s?.id;

  const [prevId, setPrevId] = useState(id);
  if (id !== prevId) {
    setPrevId(id);
    setEditing(false);
    setDetail(null);
  }

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    loadStudentDetail(id)
      .then((d) => !cancelled && setDetail(d))
      .catch(() => !cancelled && setDetail({ emails: [], homework: [], notes: [] }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const tutor = tutors.find((t) => t.id === s?.assigned_tutor_id);

  return (
    <Sheet open={!!s} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="overflow-y-auto" data-lenis-prevent>
        {s && (
          <>
            <SheetHeader className="gap-2">
              <p className="eyebrow text-brass-700">{STAGE_LABEL[s.stage]}</p>
              <div className="flex items-start justify-between gap-4 pr-12">
                <SheetTitle className="text-3xl">
                  {s.first_name} <span className="font-sans text-lg text-ink-600">· {s.grade}</span>
                </SheetTitle>
              </div>
              <SheetDescription className="sr-only">Student profile</SheetDescription>
              <PrefIcons parentText={!!s.family?.parent_sms_opt_in} studentEmail={s.email_updates} studentText={s.text_updates} />
            </SheetHeader>

            {editing ? (
              <div className="px-6">
                <StudentForm
                  initial={studentToForm(s)}
                  tutors={tutors}
                  submitLabel="Save changes"
                  onCancel={() => setEditing(false)}
                  onSubmit={async (v) => {
                    const r = await updateStudentProfile(s.id, s.family_id, v);
                    if (!r.ok) {
                      toast.error(r.error);
                      return false;
                    }
                    toast.success("Profile saved");
                    setEditing(false);
                    return true;
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-8 px-6 pb-8">
                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {(s.stage === "new" || s.stage === "contacted") && (
                    <>
                      <Button onClick={() => setDialog(s.stage === "new" ? "email" : "consult")}>
                        {s.stage === "new" ? <Mail /> : <CalendarClock />}
                        {s.stage === "new" ? "Email parent to book consultation" : "Schedule consultation"}
                      </Button>
                      <Button variant="outline" onClick={() => setDialog(s.stage === "new" ? "consult" : "email")}>
                        {s.stage === "new" ? "Schedule consultation" : "Email parent"}
                      </Button>
                    </>
                  )}
                  {s.stage === "prospect" && (
                    <>
                      <Button onClick={() => setDialog("convert")}>
                        <UserCheck /> IvyUp student
                      </Button>
                      <Button variant="outline" onClick={() => setDialog("email")}>
                        <Mail /> Email parent
                      </Button>
                    </>
                  )}
                  {s.stage === "active" && (
                    <>
                      <Button onClick={() => setDialog("session")}>
                        <CalendarPlus /> Schedule session
                      </Button>
                      <Button variant="outline" onClick={() => setDialog("reassign")}>
                        <Users /> Change tutor
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" onClick={() => setEditing(true)}>
                    <Pencil /> Edit
                  </Button>
                  {s.stage !== "archived" ? (
                    <Button
                      variant="ghost"
                      onClick={() =>
                        start(async () => {
                          const prev = s.stage;
                          onMoved("archived");
                          const r = await setStudentStage(s.id, "archived");
                          if (!r.ok) return void toast.error(r.error);
                          toast(`${s.first_name} archived`, { action: { label: "Undo", onClick: () => setStudentStage(s.id, prev) } });
                          onClose();
                        })
                      }
                    >
                      <Archive /> Archive
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() =>
                        start(async () => {
                          const back: StudentStage = s.assigned_tutor_id ? "active" : "new";
                          onMoved(back);
                          const r = await setStudentStage(s.id, back);
                          if (r.ok) toast.success(`${s.first_name} restored`);
                        })
                      }
                    >
                      <ArchiveRestore /> Restore
                    </Button>
                  )}
                </div>

                {/* Upcoming */}
                {(nextConsult || nextSession) && (
                  <div className="flex flex-col gap-1 rounded-md bg-ivy-100 px-4 py-2 text-sm text-ivy-900">
                    {nextConsult && <p className="tabular">Consultation · <span className="font-semibold">{fmtWhen(nextConsult.starts_at)}</span></p>}
                    {nextSession && <p className="tabular">Next session · <span className="font-semibold">{fmtWhen(nextSession.starts_at)}</span></p>}
                  </div>
                )}

                <Section title="Parent">
                  {s.family ? (
                    <dl>
                      <DetailRow label="Name">{s.family.parent_name}</DetailRow>
                      <DetailRow label="Phone">
                        <PhoneLine phone={s.family.parent_phone} label="Parent phone" />
                      </DetailRow>
                      <DetailRow label="Email">
                        <EmailLine email={s.family.parent_email} />
                      </DetailRow>
                      <DetailRow label="Texts">{s.family.parent_sms_opt_in ? "Yes, text about scheduling and sessions" : "No"}</DetailRow>
                    </dl>
                  ) : (
                    <p className="text-sm text-ink-600">No parent on file.</p>
                  )}
                  {s.family && (
                    <Button asChild variant="outline" size="sm" className="w-fit">
                      <a href={smsHref(s.family.parent_phone, `Hi ${s.family.parent_name.split(" ")[0]}, this is IvyUp. `)}>
                        <MessageSquareText /> Text parent from my phone
                      </a>
                    </Button>
                  )}
                </Section>

                <Section title="Student">
                  <dl>
                    <DetailRow label="First name">{s.first_name}</DetailRow>
                    <DetailRow label="Grade">{s.grade}</DetailRow>
                    <DetailRow label="Phone">{s.phone ? <PhoneLine phone={s.phone} label="Student phone" /> : null}</DetailRow>
                    <DetailRow label="Email">{s.email ? <EmailLine email={s.email} /> : null}</DetailRow>
                    <DetailRow label="Updates">
                      {[s.email_updates && "Email student", s.text_updates && "Text student"].filter(Boolean).join(" · ") || "None requested"}
                    </DetailRow>
                  </dl>
                </Section>

                <Section title="Tutoring">
                  <dl>
                    <DetailRow label="Tests">
                      <span className="flex flex-wrap gap-1">
                        {[...s.subjects.filter((x) => x !== "AP exam"), ...s.ap_exams].map((x) => (
                          <Chip key={x} tone={x.startsWith("AP ") ? "brass" : "ivy"}>
                            {x}
                          </Chip>
                        ))}
                      </span>
                    </DetailRow>
                    <DetailRow label="Preferred tutor">{s.preferred_tutor}</DetailRow>
                    <DetailRow label="Assigned tutor">{tutor?.full_name}</DetailRow>
                    <DetailRow label="Source">{s.source === "form" ? `Website form · ${fmt(s.created_at, "MMM d, yyyy")}` : `Added by you · ${fmt(s.created_at, "MMM d, yyyy")}`}</DetailRow>
                    <DetailRow label="Consent">{s.consent_guardian && s.consent_contact ? "Guardian confirmed · contact agreed" : "—"}</DetailRow>
                  </dl>
                </Section>

                {s.owner_notes && (
                  <Section title="Private notes">
                    <p className="text-sm whitespace-pre-wrap text-ink-900">{s.owner_notes}</p>
                  </Section>
                )}

                <Section title="Email history">
                  {!detail ? (
                    <Skeleton className="h-12 w-full" />
                  ) : detail.emails.length === 0 ? (
                    <p className="text-sm text-ink-600">No emails sent yet.</p>
                  ) : (
                    <ul className="flex flex-col divide-y divide-line">
                      {detail.emails.map((e) => (
                        <li key={e.id} className="flex items-baseline justify-between gap-4 py-2 text-sm">
                          <span className="truncate text-ink-900">{e.subject}</span>
                          <span className="shrink-0 text-ink-600 tabular">
                            {fmt(e.sent_at, "MMM d")}
                            {e.status === "dev_outbox" && " · test"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>

                {s.stage === "active" && (
                  <>
                    <Section title="Homework">
                      {!detail ? (
                        <Skeleton className="h-12 w-full" />
                      ) : detail.homework.length === 0 ? (
                        <p className="text-sm text-ink-600">The tutor hasn&apos;t assigned homework yet.</p>
                      ) : (
                        <ul className="flex flex-col divide-y divide-line">
                          {detail.homework.map((h) => (
                            <li key={h.id} className="flex items-baseline justify-between gap-4 py-2 text-sm">
                              <span className="text-ink-900">{h.description}</span>
                              <span className="shrink-0 text-ink-600 tabular">Due {fmt(`${h.due_date}T12:00:00Z`, "MMM d")}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Section>
                    <Section title="Session notes">
                      {!detail ? (
                        <Skeleton className="h-12 w-full" />
                      ) : detail.notes.filter((n) => n.body.trim()).length === 0 ? (
                        <p className="text-sm text-ink-600">No session notes yet.</p>
                      ) : (
                        <ul className="flex flex-col gap-4">
                          {detail.notes
                            .filter((n) => n.body.trim())
                            .map((n) => (
                              <li key={n.id} className="flex flex-col gap-1 border-b border-line pb-4 text-sm">
                                <span className="text-ink-600 tabular">{fmt(`${n.occurrence_date}T12:00:00Z`, "EEE, MMM d")}</span>
                                <p className="whitespace-pre-wrap text-ink-900">{n.body}</p>
                              </li>
                            ))}
                        </ul>
                      )}
                    </Section>
                  </>
                )}
              </div>
            )}

            {s.family && (
              <EmailDialog
                open={dialog === "email"}
                onOpenChange={(o) => setDialog(o ? "email" : null)}
                to={s.family.parent_email}
                title={s.stage === "new" || s.stage === "contacted" ? "Book a consultation" : `Email ${s.family.parent_name}`}
                initial={
                  s.stage === "new" || s.stage === "contacted"
                    ? consultationRequest({ parentName: s.family.parent_name, studentName: s.first_name, subjects: subjectsLabel(s.subjects, s.ap_exams) || "test" })
                    : { subject: `${s.first_name} at IvyUp`, body: `Hi ${s.family.parent_name.split(" ")[0]},\n\n\n\nThe IvyUp team` }
                }
                onSend={async (subject, body) => {
                  const r = await emailParent(s.id, subject, body);
                  if (r.ok && s.stage === "new") onMoved("contacted");
                  return r;
                }}
              />
            )}
            <SlotDialog
              open={dialog === "consult"}
              onOpenChange={(o) => setDialog(o ? "consult" : null)}
              title={`Consultation about ${s.first_name}`}
              submitLabel="Schedule consultation"
              defaultDuration={20}
              onSubmit={async (slot) => {
                const r = await scheduleConsultation(s.id, slot);
                if (!r.ok) {
                  toast.error(r.error);
                  return false;
                }
                onMoved("prospect");
                toast.success("Consultation scheduled", { description: `${s.first_name} moved to Potential prospects.` });
                return true;
              }}
            />
            <SlotDialog
              open={dialog === "session"}
              onOpenChange={(o) => setDialog(o ? "session" : null)}
              title={`Session for ${s.first_name}`}
              description={tutor ? `With ${tutor.full_name}. It appears on their calendar too.` : undefined}
              submitLabel="Schedule session"
              defaultDuration={60}
              defaults={{ weekly: true }}
              allowWeekly
              onSubmit={async (slot) => {
                const r = await createSession(s.id, slot);
                if (!r.ok) {
                  toast.error(r.error);
                  return false;
                }
                toast.success("Session scheduled");
                return true;
              }}
            />
            <ConvertDialog open={dialog === "convert"} onOpenChange={(o) => setDialog(o ? "convert" : null)} s={s} tutors={tutors} onMoved={onMoved} />
            <ReassignDialog open={dialog === "reassign"} onOpenChange={(o) => setDialog(o ? "reassign" : null)} s={s} tutors={tutors} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="eyebrow text-ink-600">{title}</h3>
      {children}
    </section>
  );
}

function ReassignDialog({ open, onOpenChange, s, tutors }: { open: boolean; onOpenChange: (o: boolean) => void; s: StudentWithFamily; tutors: Tutor[] }) {
  const [tutorId, setTutorId] = useState(s.assigned_tutor_id ?? "");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change {s.first_name}&apos;s tutor</DialogTitle>
          <DialogDescription>Their sessions move to the new tutor&apos;s calendar. The previous tutor loses access.</DialogDescription>
        </DialogHeader>
        <Field label="Tutor" htmlFor="reassign-tutor">
          <TutorSelect id="reassign-tutor" tutors={tutors} value={tutorId} onChange={setTutorId} />
        </Field>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!tutorId || tutorId === s.assigned_tutor_id || pending}
            onClick={() =>
              start(async () => {
                const r = await reassignTutor(s.id, tutorId);
                if (!r.ok) return void toast.error(r.error);
                toast.success("Tutor changed");
                onOpenChange(false);
              })
            }
          >
            Change tutor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
