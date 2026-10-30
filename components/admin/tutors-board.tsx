"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition, startTransition as startT } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarClock, ChevronDown, ChevronRight, GraduationCap, Link2, Mail, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field } from "@/components/shared/form-bits";
import { Chip, EmailLine, EmptyState, PageHeader, PhoneLine } from "@/components/admin/ui";
import { CredentialsDialog, EmailDialog, SlotDialog, type Credentials } from "@/components/admin/dialogs";
import { ApplicationDetails } from "@/components/admin/application-details";
import { addTutor, emailApplicant, makeTutor, scheduleInterview, setApplicationStage, undoInterview } from "@/app/admin/actions";
import { interviewRequest } from "@/lib/email/templates";
import { fmt, fmtWhen } from "@/lib/time";
import type { ApplicationStage, Occurrence, Tutor, TutorApplication } from "@/lib/types";
import { cn } from "@/lib/utils";

type TutorRow = Tutor & { studentCount: number; nextSession?: string };

export function TutorsBoard({ applications, tutors, interviews }: { applications: TutorApplication[]; tutors: TutorRow[]; interviews: Record<string, Occurrence> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const focusApp = params.get("app");
  const [tab, setTab] = useState(params.get("tab") === "current" ? "current" : "applications");
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [adding, setAdding] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const [apps, applyStage] = useOptimistic(applications, (list, m: { id: string; stage: ApplicationStage }) =>
    list.map((a) => (a.id === m.id ? { ...a, stage: m.stage } : a)),
  );
  const move = (id: string, stage: ApplicationStage) => startT(() => applyStage({ id, stage }));

  const open = apps.filter((a) => ["new", "contacted", "interview_scheduled"].includes(a.stage));
  const past = apps.filter((a) => a.stage === "hired" || a.stage === "rejected");

  function changeTab(t: string) {
    setTab(t);
    const sp = new URLSearchParams(params);
    sp.set("tab", t);
    sp.delete("app");
    router.replace(`${pathname}?${sp}`, { scroll: false });
  }

  return (
    <>
      <PageHeader
        title="Tutors"
        description="Review applications, schedule interviews, and manage your team."
        action={
          <Button variant="outline" onClick={() => setAdding(true)}>
            <Plus /> Add tutor
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={changeTab} className="gap-0">
        <div className="sticky top-14 z-20 border-b border-line bg-paper/95 px-4 backdrop-blur-md sm:px-8 lg:top-0">
          <TabsList variant="line" className="h-12 justify-start gap-8">
            <TabsTrigger value="applications" className="h-12 flex-none px-0 text-base">
              Tutor applications <span className="rounded-full bg-paper-2 px-2 py-0.5 text-xs text-ink-600 tabular">{open.length}</span>
            </TabsTrigger>
            <TabsTrigger value="current" className="h-12 flex-none px-0 text-base">
              Current tutors <span className="rounded-full bg-paper-2 px-2 py-0.5 text-xs text-ink-600 tabular">{tutors.filter((t) => t.active).length}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="px-4 py-6 sm:px-8">
          <TabsContent value="applications" className="animate-in fade-in duration-200">
            {open.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title="No open applications"
                body="Applications from ivyup.org/apply arrive here. Share the link with Ivy League students you'd like to hire."
                action={
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await navigator.clipboard.writeText(`${window.location.origin}/apply`);
                      toast.success("Application link copied");
                    }}
                  >
                    <Link2 /> Copy application link
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col gap-4">
                {open.map((a) => (
                  <ApplicationCard key={a.id} app={a} interview={interviews[a.id]} defaultOpen={a.id === focusApp} onMoved={(st) => move(a.id, st)} onHired={setCreds} />
                ))}
              </ul>
            )}
            {past.length > 0 && (
              <div className="mt-12 flex flex-col gap-4">
                <button type="button" onClick={() => setShowPast((x) => !x)} className="flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-ink-600 hover:text-ink-900">
                  <ChevronRight className={cn("size-4 transition-transform duration-200", showPast && "rotate-90")} />
                  Hired and declined ({past.length})
                </button>
                {showPast && (
                  <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface animate-in fade-in duration-200">
                    {past.map((a) => (
                      <li key={a.id} className="flex min-h-14 items-center justify-between gap-4 px-4">
                        <span className="font-semibold text-ink-900">
                          {a.full_name} <span className="font-normal text-ink-600">· {a.school}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <Chip tone={a.stage === "hired" ? "ivy" : "neutral"}>{a.stage === "hired" ? "Hired" : "Declined"}</Chip>
                          {a.stage === "rejected" && (
                            <Button variant="ghost" size="sm" onClick={async () => (move(a.id, "new"), await setApplicationStage(a.id, "new"))}>
                              Reopen
                            </Button>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="current" className="animate-in fade-in duration-200">
            {tutors.length === 0 ? (
              <EmptyState
                icon={UserPlus}
                title="No tutors yet"
                body="Hire from an application with Make tutor, or add someone directly. Each tutor gets their own login."
                action={
                  <Button onClick={() => setAdding(true)}>
                    <Plus /> Add tutor
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
                {tutors.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/admin/tutors/${t.id}`}
                      className="grid min-h-16 grid-cols-[1fr_auto] items-center gap-4 px-4 py-4 transition-colors hover:bg-paper-2 sm:grid-cols-[2fr_1fr_1fr_auto] sm:px-6"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="flex items-center gap-2 font-semibold text-ink-900">
                          {t.full_name}
                          {!t.active && <Chip>Inactive</Chip>}
                        </span>
                        <span className="truncate text-sm text-ink-600">
                          {[t.school, t.grad_year].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </span>
                      <span className="hidden text-sm text-ink-600 tabular sm:block">
                        {t.studentCount} {t.studentCount === 1 ? "student" : "students"}
                      </span>
                      <span className="hidden text-sm text-ink-600 tabular sm:block">{t.nextSession ? `Next ${fmt(t.nextSession, "EEE h:mm a")}` : "No sessions"}</span>
                      <ChevronRight className="size-4 text-ink-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </div>
      </Tabs>

      <AddTutorDialog open={adding} onOpenChange={setAdding} onCreated={(c) => (setCreds(c), changeTab("current"))} />
      <CredentialsDialog creds={creds} onClose={() => setCreds(null)} />
    </>
  );
}

function ApplicationCard({
  app,
  interview,
  defaultOpen,
  onMoved,
  onHired,
}: {
  app: TutorApplication;
  interview?: Occurrence;
  defaultOpen?: boolean;
  onMoved: (st: ApplicationStage) => void;
  onHired: (c: Credentials) => void;
}) {
  const [expanded, setExpanded] = useState(!!defaultOpen);
  const [dialog, setDialog] = useState<null | "email" | "interview" | "hire">(null);
  const [, start] = useTransition();
  const scores = [app.sat_score && `SAT ${app.sat_score}`, app.act_score && `ACT ${app.act_score}`].filter(Boolean) as string[];

  function reject() {
    start(async () => {
      const prev = app.stage;
      onMoved("rejected");
      const r = await setApplicationStage(app.id, "rejected");
      if (!r.ok) return void toast.error(r.error);
      toast(`${app.full_name} declined`, { action: { label: "Undo", onClick: () => setApplicationStage(app.id, prev) } });
    });
  }

  return (
    <li
      ref={(el) => {
        if (el && defaultOpen) el.scrollIntoView({ block: "center" });
      }}
      className={cn(
        "rounded-xl border bg-surface transition-[border-color,box-shadow] duration-200 hover:shadow-lift animate-in fade-in slide-in-from-bottom-1 duration-300",
        defaultOpen ? "border-ivy-700" : "border-line",
      )}
    >
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="font-display text-2xl text-ink-900">
            {app.full_name}
            {app.preferred_name && <span className="font-sans text-base text-ink-600"> “{app.preferred_name}”</span>}
          </h3>
          <p className="eyebrow text-brass-700">
            {app.school} · {app.year}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-600">
          <PhoneLine phone={app.phone} />
          <EmailLine email={app.email} />
        </div>
        <p className="text-sm text-ink-600">
          Major: <span className="font-semibold text-ink-900">{app.major}</span>
        </p>
        <div className="flex flex-wrap gap-1">
          {scores.map((s) => (
            <Chip key={s} tone="brass">
              {s}
            </Chip>
          ))}
          {app.ap_scores && <Chip tone="brass">AP: {app.ap_scores}</Chip>}
          {scores.length === 0 && !app.ap_scores && <span className="text-sm text-ink-400">No scores shared</span>}
        </div>
        <p className="text-sm text-ink-600">
          <span className="font-semibold text-ink-900">Teaches:</span> {app.subjects.join(", ")}
        </p>
        <button
          type="button"
          onClick={() => setExpanded((x) => !x)}
          aria-expanded={expanded}
          className="flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-ivy-700"
        >
          <ChevronDown className={cn("size-4 transition-transform duration-200 ease-soft", expanded && "rotate-180")} />
          {expanded ? "Hide full application" : "Full application"}
        </button>
        <div className={cn("grid transition-[grid-template-rows,opacity] duration-300 ease-soft", expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
          <div className="overflow-hidden">{expanded && <ApplicationDetails app={app} />}</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2 sm:px-6">
        <p className="text-xs text-ink-600 tabular">
          {app.stage === "interview_scheduled" && interview ? (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink-900">
              <CalendarClock className="size-4 text-brass-700" /> Interview {fmtWhen(interview.starts_at)}
            </span>
          ) : app.last_emailed_at ? (
            <>Emailed {fmt(app.last_emailed_at, "MMM d")}</>
          ) : (
            <>Applied {fmt(app.created_at, "MMM d")}</>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={reject}>
            Decline
          </Button>
          {app.stage === "new" && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setDialog("interview")}>
                Schedule now
              </Button>
              <Button onClick={() => setDialog("email")}>
                <Mail /> Email to schedule interview
              </Button>
            </>
          )}
          {app.stage === "contacted" && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setDialog("email")}>
                Email again
              </Button>
              <Button onClick={() => setDialog("interview")}>
                <CalendarClock /> Schedule interview
              </Button>
            </>
          )}
          {app.stage === "interview_scheduled" && (
            <Button onClick={() => setDialog("hire")}>
              <UserPlus /> Make tutor
            </Button>
          )}
        </div>
      </div>

      <EmailDialog
        open={dialog === "email"}
        onOpenChange={(o) => setDialog(o ? "email" : null)}
        to={app.email}
        title="Invite to interview"
        initial={interviewRequest({ name: app.preferred_name || app.full_name })}
        onSend={async (subject, body) => {
          const r = await emailApplicant(app.id, subject, body);
          if (r.ok && app.stage === "new") onMoved("contacted");
          return r;
        }}
      />
      <SlotDialog
        open={dialog === "interview"}
        onOpenChange={(o) => setDialog(o ? "interview" : null)}
        title={`Interview with ${app.full_name}`}
        description="It appears on your calendar."
        submitLabel="Schedule interview"
        defaultDuration={20}
        onSubmit={async (slot) => {
          const r = await scheduleInterview(app.id, slot);
          if (!r.ok) {
            toast.error(r.error);
            return false;
          }
          onMoved("interview_scheduled");
          const { eventId, prevStage } = r.data;
          toast.success("Interview scheduled", { action: { label: "Undo", onClick: () => undoInterview(eventId, app.id, prevStage) } });
          return true;
        }}
      />
      <MakeTutorDialog
        open={dialog === "hire"}
        onOpenChange={(o) => setDialog(o ? "hire" : null)}
        app={app}
        onDone={(c) => {
          onMoved("hired");
          onHired(c);
        }}
      />
    </li>
  );
}

function MakeTutorDialog({ open, onOpenChange, app, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; app: TutorApplication; onDone: (c: Credentials) => void }) {
  const [wage, setWage] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make {app.full_name} a tutor</DialogTitle>
          <DialogDescription>Everything from their application carries over. We&apos;ll create their login and show it to you once.</DialogDescription>
        </DialogHeader>
        <Field label="Hourly wage" htmlFor="hire-wage" hint="Private. Only you see this.">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ink-600">$</span>
            <Input id="hire-wage" inputMode="decimal" className="pl-8 tabular" value={wage} onChange={(e) => setWage(e.target.value)} placeholder="25" />
          </div>
        </Field>
        <Field label="Notes" htmlFor="hire-notes" optional>
          <Textarea id="hire-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!wage || pending}
            onClick={() =>
              start(async () => {
                const r = await makeTutor(app.id, wage, notes);
                if (!r.ok) return void toast.error(r.error);
                onOpenChange(false);
                toast.success(`${app.full_name} is now an IvyUp tutor`);
                onDone(r.data);
              })
            }
          >
            {pending ? "Creating…" : "Make tutor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddTutorDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (c: Credentials) => void }) {
  const empty = { fullName: "", email: "", phone: "", school: "", gradYear: "", major: "", wage: "", notes: "" };
  const [v, setV] = useState(empty);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v, x: string) => setV((p) => ({ ...p, [k]: x }));
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setV(empty);
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a tutor</DialogTitle>
          <DialogDescription>For tutors who didn&apos;t apply through the site. We&apos;ll generate their login.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="at-name" className="sm:col-span-2">
            <Input id="at-name" value={v.fullName} onChange={(e) => set("fullName", e.target.value)} />
          </Field>
          <Field label="Hourly wage" htmlFor="at-wage">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ink-600">$</span>
              <Input id="at-wage" inputMode="decimal" className="pl-8 tabular" value={v.wage} onChange={(e) => set("wage", e.target.value)} />
            </div>
          </Field>
          <Field label="Email" htmlFor="at-email" optional>
            <Input id="at-email" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Phone" htmlFor="at-phone" optional>
            <Input id="at-phone" type="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="School" htmlFor="at-school" optional>
            <Input id="at-school" value={v.school} onChange={(e) => set("school", e.target.value)} />
          </Field>
          <Field label="Year" htmlFor="at-year" optional>
            <Input id="at-year" value={v.gradYear} onChange={(e) => set("gradYear", e.target.value)} placeholder="e.g. Junior, or 2027" />
          </Field>
          <Field label="Major" htmlFor="at-major" optional>
            <Input id="at-major" value={v.major} onChange={(e) => set("major", e.target.value)} />
          </Field>
          <Field label="Notes" htmlFor="at-notes" optional className="sm:col-span-2">
            <Textarea id="at-notes" rows={3} value={v.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!v.fullName || !v.wage || pending}
            onClick={() =>
              start(async () => {
                const r = await addTutor(v);
                if (!r.ok) return void toast.error(r.error);
                onOpenChange(false);
                setV(empty);
                onCreated(r.data);
              })
            }
          >
            {pending ? "Creating…" : "Add tutor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
