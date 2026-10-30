"use client";

import { useOptimistic, useState, startTransition as startT } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarClock, Check, ChevronRight, Link2, Mail, Plus, Sparkles, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Chip, EmailLine, EmptyState, PageHeader, PhoneLine, PrefIcons } from "@/components/admin/ui";
import { EmailDialog, SlotDialog } from "@/components/admin/dialogs";
import { StudentForm, studentToForm } from "@/components/admin/student-form";
import { StudentSheet } from "@/components/admin/student-sheet";
import { ConvertDialog } from "@/components/admin/convert-dialog";
import {
  addStudent,
  emailParent,
  scheduleConsultation,
  undoConsultation,
} from "@/app/admin/actions";
import { consultationRequest } from "@/lib/email/templates";
import { subjectsLabel } from "@/lib/format";
import { etToUtc, fmt, fmtWhen } from "@/lib/time";
import type { Occurrence, StudentStage, StudentWithFamily, Tutor } from "@/lib/types";
import { cn } from "@/lib/utils";

type Next = Record<string, Occurrence>;
type Tab = "responses" | "prospects" | "current";

const TAB_STAGES: Record<Tab, StudentStage[]> = {
  responses: ["new", "contacted"],
  prospects: ["prospect"],
  current: ["active"],
};

export function ProspectsBoard({ students, tutors, next }: { students: StudentWithFamily[]; tutors: Tutor[]; next: Next }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const initialStudent = params.get("student");
  const initialTab: Tab = (() => {
    const t = params.get("tab");
    if (t === "prospects" || t === "current" || t === "responses") return t;
    const s = students.find((x) => x.id === initialStudent);
    if (s?.stage === "prospect") return "prospects";
    if (s?.stage === "active") return "current";
    return "responses";
  })();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [showArchived, setShowArchived] = useState(false);
  const [openStudentId, setOpenStudentId] = useState<string | null>(initialStudent);
  const [adding, setAdding] = useState(false);

  const [optimistic, applyStage] = useOptimistic(students, (list, move: { id: string; stage: StudentStage }) =>
    list.map((s) => (s.id === move.id ? { ...s, stage: move.stage } : s)),
  );

  const tutorName = (id: string | null) => tutors.find((t) => t.id === id)?.full_name ?? null;
  const byTab = (t: Tab) => optimistic.filter((s) => TAB_STAGES[t].includes(s.stage));
  const archived = optimistic.filter((s) => s.stage === "archived");
  const openStudent = optimistic.find((s) => s.id === openStudentId) ?? null;

  function changeTab(t: string) {
    setTab(t as Tab);
    const sp = new URLSearchParams(params);
    sp.set("tab", t);
    sp.delete("student");
    router.replace(`${pathname}?${sp}`, { scroll: false });
  }

  function moveTo(id: string, stage: StudentStage) {
    startT(() => applyStage({ id, stage }));
  }

  const counts = { responses: byTab("responses").length, prospects: byTab("prospects").length, current: byTab("current").length };

  return (
    <>
      <PageHeader
        title="Prospects"
        description="Every family from first form to current student."
        action={
          <Button variant="outline" onClick={() => setAdding(true)}>
            <Plus /> Add student
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={changeTab} className="gap-0">
        <div className="sticky top-14 z-20 border-b border-line bg-paper/95 px-4 backdrop-blur-md sm:px-8 lg:top-0">
          <TabsList variant="line" className="h-12 w-full justify-start gap-4 overflow-x-auto sm:gap-8">
            <TabTrigger value="responses" label="Form responses" count={counts.responses} />
            <TabTrigger value="prospects" label="Potential prospects" count={counts.prospects} />
            <TabTrigger value="current" label="Current students" count={counts.current} />
          </TabsList>
        </div>

        <div className="px-4 py-6 sm:px-8">
          <TabsContent value="responses" className="animate-in fade-in duration-200">
            <StudentList
              students={byTab("responses")}
              empty={
                <EmptyState
                  icon={Sparkles}
                  title="No new families yet"
                  body={<>New sign-ups from the website land here, newest first. Share the sign-up link with families to get started.</>}
                  action={<CopyLinkButton path="/get-started" />}
                />
              }
              render={(s) => (
                <ResponseCard key={s.id} s={s} onOpen={() => setOpenStudentId(s.id)} onMoved={(stage) => moveTo(s.id, stage)} onAfterMove={() => changeTab("prospects")} />
              )}
            />
          </TabsContent>

          <TabsContent value="prospects" className="animate-in fade-in duration-200">
            <StudentList
              students={byTab("prospects")}
              empty={<EmptyState icon={CalendarClock} title="No consultations scheduled" body="When you schedule a consultation from Form responses, the family moves here." />}
              render={(s) => (
                <ProspectCard
                  key={s.id}
                  s={s}
                  consult={next[`consultation:${s.id}`]}
                  tutors={tutors}
                  onOpen={() => setOpenStudentId(s.id)}
                  onMoved={(stage) => moveTo(s.id, stage)}
                />
              )}
            />
          </TabsContent>

          <TabsContent value="current" className="animate-in fade-in duration-200">
            <StudentList
              students={byTab("current")}
              empty={<EmptyState icon={UserCheck} title="No current students yet" body="Mark a prospect as an IvyUp student after their consultation, and choose their tutor." />}
              render={(s) => (
                <CurrentCard key={s.id} s={s} tutorName={tutorName(s.assigned_tutor_id)} session={next[`session:${s.id}`]} onOpen={() => setOpenStudentId(s.id)} />
              )}
            />
            {archived.length > 0 && (
              <div className="mt-12 flex flex-col gap-4">
                <button type="button" onClick={() => setShowArchived((x) => !x)} className="flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-ink-600 hover:text-ink-900">
                  <ChevronRight className={cn("size-4 transition-transform duration-200", showArchived && "rotate-90")} />
                  Archived ({archived.length})
                </button>
                {showArchived && (
                  <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface animate-in fade-in duration-200">
                    {archived.map((s) => (
                      <li key={s.id}>
                        <button type="button" onClick={() => setOpenStudentId(s.id)} className="flex min-h-14 w-full items-center justify-between gap-4 px-4 text-left hover:bg-paper-2">
                          <span className="font-semibold text-ink-900">
                            {s.first_name} <span className="font-normal text-ink-600">· {s.grade}</span>
                          </span>
                          <span className="text-sm text-ink-600">{s.family?.parent_name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>

      <StudentSheet
        student={openStudent}
        tutors={tutors}
        nextConsult={openStudent ? next[`consultation:${openStudent.id}`] : undefined}
        nextSession={openStudent ? next[`session:${openStudent.id}`] : undefined}
        onClose={() => {
          setOpenStudentId(null);
          if (params.get("student")) {
            const sp = new URLSearchParams(params);
            sp.delete("student");
            router.replace(`${pathname}?${sp}`, { scroll: false });
          }
        }}
        onMoved={(stage) => openStudent && moveTo(openStudent.id, stage)}
      />

      <Sheet open={adding} onOpenChange={setAdding}>
        <SheetContent side="right" className="overflow-y-auto" data-lenis-prevent>
          <SheetHeader>
            <SheetTitle>Add a student</SheetTitle>
            <SheetDescription>For families who reached you by phone, referral, or email.</SheetDescription>
          </SheetHeader>
          <div className="px-6 pb-0">
            <StudentForm
              initial={studentToForm()}
              tutors={tutors}
              showStage
              submitLabel="Add student"
              onCancel={() => setAdding(false)}
              onSubmit={async (v) => {
                const r = await addStudent(v);
                if (!r.ok) {
                  toast.error(r.error);
                  return false;
                }
                toast.success(`${v.firstName} added`);
                setAdding(false);
                changeTab(v.stage === "active" ? "current" : v.stage === "prospect" ? "prospects" : "responses");
                return true;
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function TabTrigger({ value, label, count }: { value: string; label: string; count: number }) {
  return (
    <TabsTrigger value={value} className="h-12 flex-none px-0 text-sm sm:text-base">
      {label}
      <span className="rounded-full bg-paper-2 px-2 py-0.5 text-xs text-ink-600 tabular">{count}</span>
    </TabsTrigger>
  );
}

function StudentList({ students, render, empty }: { students: StudentWithFamily[]; render: (s: StudentWithFamily) => React.ReactNode; empty: React.ReactNode }) {
  if (students.length === 0) return <>{empty}</>;
  return <ul className="flex flex-col gap-4">{students.map((s) => render(s))}</ul>;
}

function CopyLinkButton({ path }: { path: string }) {
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await navigator.clipboard.writeText(`${window.location.origin}${path}`);
        toast.success("Sign-up link copied");
      }}
    >
      <Link2 /> Copy sign-up link
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

function CardShell({ s, onOpen, children, footer }: { s: StudentWithFamily; onOpen: () => void; children?: React.ReactNode; footer: React.ReactNode }) {
  const subjects = [...s.subjects.filter((x) => x !== "AP exam"), ...s.ap_exams];
  return (
    <li className="group rounded-xl border border-line bg-surface transition-[border-color,box-shadow] duration-200 ease-soft hover:border-ink-400/50 hover:shadow-lift animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())}
        className="flex cursor-pointer flex-col gap-4 rounded-t-xl p-4 outline-none sm:p-6"
        aria-label={`Open ${s.first_name}'s profile`}
      >
        <div className="flex items-start justify-between gap-4">
          <h3 className="flex flex-wrap items-baseline gap-x-2 font-display text-2xl text-ink-900">
            {s.first_name}
            <span className="font-sans text-base font-normal text-ink-600">· {s.grade}</span>
          </h3>
          <PrefIcons parentText={!!s.family?.parent_sms_opt_in} studentEmail={s.email_updates} studentText={s.text_updates} />
        </div>
        {subjects.length > 0 && (
          <ul className="flex flex-wrap gap-1">
            {subjects.map((x) => (
              <li key={x}>
                <Chip tone={x.startsWith("AP ") ? "brass" : "ivy"}>{x}</Chip>
              </li>
            ))}
          </ul>
        )}
        {s.family && (
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-semibold text-ink-900">{s.family.parent_name}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-600">
              <PhoneLine phone={s.family.parent_phone} label="Parent phone" />
              <EmailLine email={s.family.parent_email} />
            </div>
          </div>
        )}
        {s.preferred_tutor && (
          <p className="text-sm text-ink-600">
            Preferred tutor: <span className="font-semibold text-ink-900">{s.preferred_tutor}</span>
          </p>
        )}
        {children}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2 sm:px-6">{footer}</div>
    </li>
  );
}

function ResponseCard({ s, onOpen, onMoved, onAfterMove }: { s: StudentWithFamily; onOpen: () => void; onMoved: (st: StudentStage) => void; onAfterMove: () => void }) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [slotOpen, setSlotOpen] = useState(false);
  const emailed = s.stage === "contacted" || !!s.last_emailed_at;
  const template = consultationRequest({
    parentName: s.family?.parent_name ?? "there",
    studentName: s.first_name,
    subjects: subjectsLabel(s.subjects, s.ap_exams) || "test",
  });

  return (
    <CardShell
      s={s}
      onOpen={onOpen}
      footer={
        <>
          <p className="text-xs text-ink-600">
            {emailed && s.last_emailed_at ? (
              <span className="inline-flex items-center gap-1 font-semibold text-ivy-700">
                <Check className="size-3.5" /> Emailed {fmt(s.last_emailed_at, "MMM d")}
              </span>
            ) : (
              <>Received {fmt(s.created_at, "MMM d, h:mm a")}</>
            )}
          </p>
          <div className="flex items-center gap-2">
            {emailed ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setEmailOpen(true)}>
                  Email again
                </Button>
                <Button onClick={() => setSlotOpen(true)}>
                  <CalendarClock /> Schedule consultation
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => setSlotOpen(true)}>
                  Schedule now
                </Button>
                <Button onClick={() => setEmailOpen(true)}>
                  <Mail /> Email parent to book consultation
                </Button>
              </>
            )}
          </div>
          <EmailDialog
            open={emailOpen}
            onOpenChange={setEmailOpen}
            to={s.family?.parent_email ?? ""}
            title="Book a consultation"
            initial={template}
            onSend={async (subject, body) => {
              const r = await emailParent(s.id, subject, body);
              if (r.ok && s.stage === "new") onMoved("contacted");
              return r;
            }}
          />
          <SlotDialog
            open={slotOpen}
            onOpenChange={setSlotOpen}
            title={`Consultation with ${s.family?.parent_name ?? "the family"}`}
            description={`About ${s.first_name}. It will appear on your calendar and the family moves to Potential prospects.`}
            submitLabel="Schedule consultation"
            defaultDuration={20}
            onSubmit={async (slot) => {
              const r = await scheduleConsultation(s.id, slot);
              if (!r.ok) {
                toast.error(r.error);
                return false;
              }
              onMoved("prospect");
              const { eventId, prevStage } = r.data;
              toast.success(`Consultation set for ${fmtWhen(etToUtc(slot.date, slot.time))}`, {
                description: `${s.first_name} moved to Potential prospects.`,
                action: {
                  label: "Undo",
                  onClick: async () => {
                    const u = await undoConsultation(eventId, s.id, prevStage);
                    if (u.ok) toast("Consultation removed");
                  },
                },
                cancel: { label: "View", onClick: onAfterMove },
              });
              return true;
            }}
          />
        </>
      }
    />
  );
}

function ProspectCard({
  s,
  consult,
  tutors,
  onOpen,
  onMoved,
}: {
  s: StudentWithFamily;
  consult?: Occurrence;
  tutors: Tutor[];
  onOpen: () => void;
  onMoved: (st: StudentStage) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <CardShell
      s={s}
      onOpen={onOpen}
      footer={
        <>
          <p className="flex items-center gap-2 text-sm">
            <CalendarClock className="size-4 text-ivy-700" />
            {consult ? (
              <span className="font-semibold text-ink-900 tabular">Consultation {fmtWhen(consult.starts_at)}</span>
            ) : (
              <span className="text-ink-600">Consultation done</span>
            )}
          </p>
          <Button onClick={() => setOpen(true)}>
            <UserCheck /> IvyUp student
          </Button>
          <ConvertDialog open={open} onOpenChange={setOpen} s={s} tutors={tutors} onMoved={onMoved} />
        </>
      }
    />
  );
}

function CurrentCard({ s, tutorName, session, onOpen }: { s: StudentWithFamily; tutorName: string | null; session?: Occurrence; onOpen: () => void }) {
  return (
    <CardShell
      s={s}
      onOpen={onOpen}
      footer={
        <>
          <p className="text-sm text-ink-600">
            Tutor: <span className="font-semibold text-ink-900">{tutorName ?? "Not assigned"}</span>
          </p>
          <p className="text-sm text-ink-600 tabular">
            {session ? (
              <>
                Next session <span className="font-semibold text-ink-900">{fmtWhen(session.starts_at)}</span>
              </>
            ) : (
              "No session scheduled"
            )}
          </p>
        </>
      }
    />
  );
}
