"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { CalendarPlus, Check, ChevronLeft, ChevronRight, ExternalLink, LogOut, Plus, Repeat, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/form-bits";
import { LogoMark } from "@/components/shared/logo";
import { Chip, DetailRow, EmailLine, EmptyState, PhoneLine, PrefIcons } from "@/components/admin/ui";
import { SlotDialog } from "@/components/admin/dialogs";
import { addHomework, createTutorSession, deleteHomework, deleteTutorSession, saveSessionNote, setHomeworkDone, updateTutorSession } from "@/app/tutor/actions";
import { tutorSignOut } from "@/lib/login-actions";
import { expandOccurrences, fmt, fmtRange, fmtWhen, shiftDate, todayEt } from "@/lib/time";
import type { CalendarEvent, Homework, Occurrence, SessionNote, StudentWithFamily, Tutor } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TutorPortal({
  tutor,
  students,
  events,
  homework: initialHomework,
  notes: initialNotes,
}: {
  tutor: Tutor;
  students: StudentWithFamily[];
  events: CalendarEvent[];
  homework: Homework[];
  notes: SessionNote[];
}) {
  const [homework, setHomework] = useState(initialHomework);
  const [notes, setNotes] = useState(initialNotes);
  const [session, setSession] = useState<Occurrence | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  // Take fresh server data after a revalidation, keeping local edits otherwise.
  const [prevData, setPrevData] = useState({ initialHomework, initialNotes });
  if (prevData.initialHomework !== initialHomework || prevData.initialNotes !== initialNotes) {
    setPrevData({ initialHomework, initialNotes });
    setHomework(initialHomework);
    setNotes(initialNotes);
  }

  const today = todayEt();
  const upcoming = useMemo(
    () => expandOccurrences(events, today, shiftDate(today, 60)).filter((o) => new Date(o.ends_at) > new Date()),
    [events, today],
  );
  const first = tutor.preferred_name || tutor.full_name.split(" ")[0];
  const nextUp = upcoming[0];
  const studentById = (id: string | null) => students.find((s) => s.id === id);

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2">
            <LogoMark className="size-8" />
            <span className="font-display text-xl text-ink-900">
              Ivy<span className="text-ivy-700">Up</span>
            </span>
            <span className="ml-2 rounded-sm bg-paper-2 px-2 py-0.5 text-xs font-semibold text-ink-600">Tutor</span>
          </div>
          <form action={tutorSignOut}>
            <Button variant="ghost" size="sm" type="submit">
              <LogOut /> Sign out
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-8 lg:py-12">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl text-ink-900 sm:text-5xl">Hi, {first}.</h1>
          <p className="text-lg text-ink-600">
            {nextUp ? (
              <>
                Next up: <span className="font-semibold text-ink-900">{studentById(nextUp.event.student_id)?.first_name}</span>,{" "}
                <span className="tabular">{fmtWhen(nextUp.starts_at)}</span>.
              </>
            ) : students.length ? (
              "No sessions scheduled yet. Add one from your calendar."
            ) : (
              "IvyUp will assign your first student soon."
            )}
          </p>
          {nextUp && (
            <Button className="mt-2 w-fit" onClick={() => setSession(nextUp)}>
              Open next session
            </Button>
          )}
        </div>

        <Tabs defaultValue="students" className="gap-6">
          <TabsList variant="line" className="h-12 justify-start gap-8 border-b border-line">
            <TabsTrigger value="students" className="h-12 flex-none px-0 text-base">
              Students <span className="rounded-full bg-paper-2 px-2 py-0.5 text-xs text-ink-600 tabular">{students.length}</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="h-12 flex-none px-0 text-base">
              Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="animate-in fade-in duration-200">
            {students.length === 0 ? (
              <EmptyState icon={Users} title="No students yet" body="When IvyUp matches you with a student, their profile appears here with everything you need for sessions." />
            ) : (
              <ul className="flex flex-col gap-6">
                {students.map((s) => (
                  <StudentProfile
                    key={s.id}
                    s={s}
                    sessions={events.filter((e) => e.student_id === s.id)}
                    next={upcoming.find((o) => o.event.student_id === s.id)}
                    homework={homework.filter((h) => h.student_id === s.id)}
                    notes={notes.filter((n) => events.some((e) => e.id === n.event_id && e.student_id === s.id) && n.body.trim())}
                    onAddSession={() => setAdding(s.id)}
                    onHomework={setHomework}
                  />
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="calendar" className="animate-in fade-in duration-200">
            <TutorCalendar events={events} students={students} homework={homework} onSelect={setSession} onAdd={() => setAdding(students[0]?.id ?? null)} />
          </TabsContent>
        </Tabs>
      </main>

      <SessionSheet
        occurrence={session}
        student={studentById(session?.event.student_id ?? null)}
        homework={homework}
        notes={notes}
        upcoming={upcoming}
        onHomework={setHomework}
        onNotes={setNotes}
        onClose={() => setSession(null)}
      />

      <AddSessionDialog studentId={adding} students={students} onClose={() => setAdding(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Students tab
// ---------------------------------------------------------------------------

function StudentProfile({
  s,
  sessions,
  next,
  homework,
  notes,
  onAddSession,
  onHomework,
}: {
  s: StudentWithFamily;
  sessions: CalendarEvent[];
  next?: Occurrence;
  homework: Homework[];
  notes: SessionNote[];
  onAddSession: () => void;
  onHomework: React.Dispatch<React.SetStateAction<Homework[]>>;
}) {
  const open = homework.filter((h) => !h.done);
  return (
    <li className="rounded-xl border border-line bg-surface animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-3xl text-ink-900">
              {s.first_name} <span className="font-sans text-lg text-ink-600">· {s.grade}</span>
            </h2>
            <div className="flex flex-wrap gap-1">
              {[...s.subjects.filter((x) => x !== "AP exam"), ...s.ap_exams].map((x) => (
                <Chip key={x} tone={x.startsWith("AP ") ? "brass" : "ivy"}>
                  {x}
                </Chip>
              ))}
            </div>
          </div>
          <PrefIcons parentText={!!s.family?.parent_sms_opt_in} studentEmail={s.email_updates} studentText={s.text_updates} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="flex flex-col gap-1">
            <h3 className="eyebrow text-ink-600">Contact</h3>
            <dl>
              <DetailRow label="Student phone">{s.phone ? <PhoneLine phone={s.phone} label="Student phone" /> : null}</DetailRow>
              <DetailRow label="Student email">{s.email ? <EmailLine email={s.email} /> : null}</DetailRow>
              {s.family && (
                <>
                  <DetailRow label="Parent">{s.family.parent_name}</DetailRow>
                  <DetailRow label="Parent phone">
                    <PhoneLine phone={s.family.parent_phone} label="Parent phone" />
                  </DetailRow>
                  <DetailRow label="Parent email">
                    <EmailLine email={s.family.parent_email} />
                  </DetailRow>
                </>
              )}
              <DetailRow label="Updates">
                {[s.family?.parent_sms_opt_in && "Text parent", s.email_updates && "Email student", s.text_updates && "Text student"].filter(Boolean).join(" · ") ||
                  "Email parent only"}
              </DetailRow>
            </dl>
          </section>
          <section className="flex flex-col gap-1">
            <h3 className="eyebrow text-ink-600">Sessions</h3>
            <dl>
              <DetailRow label="Next">{next ? <span className="tabular">{fmtWhen(next.starts_at)}</span> : "Not scheduled"}</DetailRow>
              {sessions.map((e) => (
                <DetailRow key={e.id} label={e.recurrence === "weekly" ? "Weekly" : "One-time"}>
                  <span className="inline-flex items-center gap-1 tabular">
                    {e.recurrence === "weekly" && <Repeat className="size-3.5 text-ivy-700" />}
                    {e.recurrence === "weekly" ? `${fmt(e.starts_at, "EEEE")}s` : fmt(e.starts_at, "EEE, MMM d")} · {fmtRange(e.starts_at, e.ends_at)} ET
                  </span>
                </DetailRow>
              ))}
            </dl>
            <Button variant="outline" size="sm" className="mt-2 w-fit" onClick={onAddSession}>
              <CalendarPlus /> Add a session
            </Button>
          </section>
        </div>

        <section className="flex flex-col gap-2">
          <h3 className="eyebrow text-ink-600">Homework ({open.length} open)</h3>
          <HomeworkList items={homework} onHomework={onHomework} />
          <AddHomework studentId={s.id} defaultDue={next?.date} onAdded={(h) => onHomework((list) => [...list, h])} />
        </section>

        {notes.length > 0 && (
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-ivy-700">
              <ChevronRight className="size-4 transition-transform duration-200 group-open:rotate-90" />
              Past session notes ({notes.length})
            </summary>
            <ul className="mt-2 flex flex-col gap-4">
              {notes.map((n) => (
                <li key={n.id} className="flex flex-col gap-1 border-l-2 border-line pl-4 text-sm">
                  <span className="text-ink-600 tabular">{fmt(`${n.occurrence_date}T12:00:00Z`, "EEE, MMM d")}</span>
                  <p className="whitespace-pre-wrap text-ink-900">{n.body}</p>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </li>
  );
}

function HomeworkList({ items, onHomework, emptyText = "No homework assigned." }: { items: Homework[]; onHomework: React.Dispatch<React.SetStateAction<Homework[]>>; emptyText?: string }) {
  const [, start] = useTransition();
  if (items.length === 0) return <p className="text-sm text-ink-600">{emptyText}</p>;
  return (
    <ul className="flex flex-col divide-y divide-line rounded-md border border-line">
      {[...items]
        .sort((a, b) => Number(a.done) - Number(b.done) || a.due_date.localeCompare(b.due_date))
        .map((h) => (
          <li key={h.id} className="flex min-h-11 items-center gap-2 px-2">
            <button
              type="button"
              aria-label={h.done ? "Mark not done" : "Mark done"}
              onClick={() => {
                onHomework((list) => list.map((x) => (x.id === h.id ? { ...x, done: !h.done } : x)));
                start(async () => {
                  const r = await setHomeworkDone(h.id, !h.done);
                  if (!r.ok) toast.error(r.error);
                });
              }}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-md",
              )}
            >
              <span className={cn("flex size-5 items-center justify-center rounded-[5px] border transition-colors duration-150", h.done ? "border-ivy-700 bg-ivy-700 text-paper" : "border-ink-400")}>
                {h.done && <Check className="size-3.5" strokeWidth={3} />}
              </span>
            </button>
            <span className={cn("flex-1 text-sm", h.done ? "text-ink-400 line-through" : "text-ink-900")}>{h.description}</span>
            <span className="shrink-0 text-xs text-ink-600 tabular">Due {fmt(`${h.due_date}T12:00:00Z`, "MMM d")}</span>
            <button
              type="button"
              aria-label="Delete homework"
              onClick={() => {
                onHomework((list) => list.filter((x) => x.id !== h.id));
                start(async () => {
                  const r = await deleteHomework(h.id);
                  if (!r.ok) toast.error(r.error);
                });
              }}
              className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-400 hover:text-danger"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
    </ul>
  );
}

function AddHomework({ studentId, defaultDue, onAdded }: { studentId: string; defaultDue?: string; onAdded: (h: Homework) => void }) {
  const [desc, setDesc] = useState("");
  const [due, setDue] = useState(defaultDue ?? shiftDate(todayEt(), 7));
  const [pending, start] = useTransition();
  const [prevDefault, setPrevDefault] = useState(defaultDue);
  if (defaultDue !== prevDefault) {
    setPrevDefault(defaultDue);
    if (defaultDue) setDue(defaultDue);
  }
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (!desc.trim()) return;
        start(async () => {
          const r = await addHomework(studentId, desc, due);
          if (!r.ok) return void toast.error(r.error);
          onAdded(r.data);
          setDesc("");
          toast.success("Homework added");
        });
      }}
    >
      <Input aria-label="New homework" placeholder="Assign homework, e.g. Practice test 4, math sections" value={desc} onChange={(e) => setDesc(e.target.value)} className="flex-1" />
      <Input aria-label="Due date" type="date" value={due} onChange={(e) => setDue(e.target.value)} className="tabular sm:w-44" />
      <Button type="submit" variant="outline" disabled={pending || !desc.trim()}>
        <Plus /> Add
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Calendar tab: week by week
// ---------------------------------------------------------------------------

function TutorCalendar({
  events,
  students,
  homework,
  onSelect,
  onAdd,
}: {
  events: CalendarEvent[];
  students: StudentWithFamily[];
  homework: Homework[];
  onSelect: (o: Occurrence) => void;
  onAdd: () => void;
}) {
  const today = todayEt();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(parseISO(`${today}T12:00:00`)));
  const days = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), "yyyy-MM-dd"));
  const occ = expandOccurrences(events, days[0], days[6]);
  const name = (id: string | null) => students.find((s) => s.id === id)?.first_name ?? "Student";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Previous week" onClick={() => setWeekStart((w) => addDays(w, -7))}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" aria-label="Next week" onClick={() => setWeekStart((w) => addDays(w, 7))}>
            <ChevronRight />
          </Button>
          <h2 className="ml-2 font-display text-2xl text-ink-900 tabular" aria-live="polite">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d")}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(startOfWeek(parseISO(`${today}T12:00:00`)))}>
            This week
          </Button>
        </div>
        {students.length > 0 && (
          <Button variant="outline" onClick={onAdd}>
            <CalendarPlus /> Add session
          </Button>
        )}
      </div>
      <ol key={days[0]} className="flex flex-col gap-2 animate-in fade-in duration-300">
        {days.map((d) => {
          const items = occ.filter((o) => o.date === d);
          const due = homework.filter((h) => h.due_date === d && !h.done);
          return (
            <li key={d} className={cn("grid grid-cols-[72px_1fr] gap-4 rounded-xl border bg-surface p-4", d === today ? "border-ivy-700" : "border-line")}>
              <div className="flex flex-col">
                <span className={cn("text-xs font-semibold uppercase", d === today ? "text-ivy-700" : "text-ink-600")}>{format(parseISO(`${d}T12:00:00`), "EEE")}</span>
                <span className="font-display text-2xl text-ink-900 tabular">{format(parseISO(`${d}T12:00:00`), "d")}</span>
              </div>
              <div className="flex flex-col gap-2">
                {items.length === 0 && <p className="py-2 text-sm text-ink-400">No sessions</p>}
                {items.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => onSelect(o)}
                    className="flex min-h-12 items-center justify-between gap-4 rounded-md border border-line bg-paper px-4 text-left transition-[border-color,transform] duration-150 hover:border-ivy-700 active:scale-[0.99]"
                  >
                    <span className="font-semibold text-ink-900">{name(o.event.student_id)}</span>
                    <span className="text-sm text-ink-600 tabular">{fmtRange(o.starts_at, o.ends_at)}</span>
                  </button>
                ))}
                {due.length > 0 && (
                  <p className="text-xs text-brass-700">
                    Homework due: {due.map((h) => `${name(h.student_id)} (${h.description})`).join(", ")}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Session sheet: homework due that day + notes
// ---------------------------------------------------------------------------

function SessionSheet({
  occurrence: o,
  student,
  homework,
  notes,
  upcoming,
  onHomework,
  onNotes,
  onClose,
}: {
  occurrence: Occurrence | null;
  student?: StudentWithFamily;
  homework: Homework[];
  notes: SessionNote[];
  upcoming: Occurrence[];
  onHomework: React.Dispatch<React.SetStateAction<Homework[]>>;
  onNotes: React.Dispatch<React.SetStateAction<SessionNote[]>>;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  if (!o) return <Sheet open={false} />;
  const e = o.event;
  const due = homework.filter((h) => h.student_id === e.student_id && h.due_date === o.date);
  const note = notes.find((n) => n.event_id === e.id && n.occurrence_date === o.date);
  const nextForStudent = upcoming.find((x) => x.event.student_id === e.student_id && x.date > o.date);

  return (
    <Sheet open={!!o} onOpenChange={(x) => !x && onClose()}>
      <SheetContent side="right" className="overflow-y-auto" data-lenis-prevent>
        <SheetHeader className="gap-2">
          <p className="eyebrow flex items-center gap-2 text-brass-700">
            Session {e.recurrence === "weekly" && <Repeat className="size-3" />}
          </p>
          <SheetTitle className="pr-12 text-3xl">{student?.first_name ?? "Student"}</SheetTitle>
          <SheetDescription className="text-base text-ink-900 tabular">
            {fmt(o.starts_at, "EEEE, MMMM d")} · {fmtRange(o.starts_at, o.ends_at)} ET
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-8 px-6 pb-8">
          <div className="flex flex-wrap gap-2">
            {e.zoom_link && (
              <Button asChild>
                <a href={e.zoom_link} target="_blank" rel="noreferrer">
                  <ExternalLink /> Join Zoom
                </a>
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditing(true)}>
              Reschedule
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  if (!window.confirm(e.recurrence === "weekly" ? "Remove this weekly session (every week)?" : "Remove this session?")) return;
                  const r = await deleteTutorSession(e.id);
                  if (!r.ok) return void toast.error(r.error);
                  toast("Session removed");
                  onClose();
                })
              }
            >
              <Trash2 /> Remove
            </Button>
          </div>

          <section className="flex flex-col gap-2">
            <h3 className="eyebrow text-ink-600">Homework due today</h3>
            <HomeworkList items={due} onHomework={onHomework} emptyText="Nothing was due for this session." />
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="eyebrow text-ink-600">Session notes</h3>
            <NotesEditor key={`${e.id}:${o.date}`} eventId={e.id} date={o.date} initial={note?.body ?? ""} onSaved={(n) => onNotes((list) => [n, ...list.filter((x) => x.id !== n.id)])} />
          </section>

          {student && (
            <section className="flex flex-col gap-2">
              <h3 className="eyebrow text-ink-600">Assign homework</h3>
              <AddHomework studentId={student.id} defaultDue={nextForStudent?.date} onAdded={(h) => onHomework((list) => [...list, h])} />
            </section>
          )}

          {e.notes && (
            <section className="flex flex-col gap-2">
              <h3 className="eyebrow text-ink-600">From IvyUp</h3>
              <p className="text-sm whitespace-pre-wrap text-ink-900">{e.notes}</p>
            </section>
          )}
        </div>

        <SlotDialog
          open={editing}
          onOpenChange={setEditing}
          title="Reschedule session"
          description={e.recurrence === "weekly" ? "This changes every week of the session." : undefined}
          submitLabel="Save"
          allowWeekly
          defaultDuration={60}
          defaults={{ startsAt: e.starts_at, endsAt: e.ends_at, zoomLink: e.zoom_link ?? "", notes: e.notes ?? "", weekly: e.recurrence === "weekly", until: e.recurrence_until ?? "" }}
          onSubmit={async (slot) => {
            const r = await updateTutorSession(e.id, {
              date: slot.date,
              time: slot.time,
              durationMin: Number(slot.durationMin),
              zoomLink: slot.zoomLink,
              notes: slot.notes,
              weekly: slot.weekly,
              until: slot.until,
            });
            if (!r.ok) {
              toast.error(r.error);
              return false;
            }
            toast.success("Session updated");
            onClose();
            return true;
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

function NotesEditor({ eventId, date, initial, onSaved }: { eventId: string; date: string; initial: string; onSaved: (n: SessionNote) => void }) {
  const [body, setBody] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(body);

  async function save(text: string) {
    setState("saving");
    const r = await saveSessionNote(eventId, date, text);
    if (latest.current !== text) return; // a newer save is coming
    if (r.ok) {
      setState("saved");
      onSaved(r.data);
    } else setState("error");
  }

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        if (latest.current !== initial) void saveSessionNote(eventId, date, latest.current);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        aria-label="Session notes"
        rows={8}
        value={body}
        placeholder="What you covered, what clicked, what to revisit next time…"
        onChange={(e) => {
          const text = e.target.value;
          setBody(text);
          latest.current = text;
          setState("idle");
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => save(text), 800);
        }}
      />
      <p className="text-xs text-ink-600" aria-live="polite">
        {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : state === "error" ? "Couldn't save. Check your connection." : "Notes save automatically. IvyUp can read them."}
      </p>
    </div>
  );
}

function AddSessionDialog({ studentId, students, onClose }: { studentId: string | null; students: StudentWithFamily[]; onClose: () => void }) {
  const [who, setWho] = useState(studentId ?? "");
  const [prevStudent, setPrevStudent] = useState(studentId);
  if (studentId !== prevStudent) {
    setPrevStudent(studentId);
    setWho(studentId ?? "");
  }
  return (
    <SlotDialog
      open={!!studentId}
      onOpenChange={(o) => !o && onClose()}
      title="Add a session"
      description="It shows on your calendar and IvyUp's."
      submitLabel="Add session"
      defaultDuration={60}
      defaults={{ weekly: true, time: "17:00" }}
      allowWeekly
      onSubmit={async (slot) => {
        if (!who) {
          toast.error("Choose a student.");
          return false;
        }
        const r = await createTutorSession(who, {
          date: slot.date,
          time: slot.time,
          durationMin: Number(slot.durationMin),
          zoomLink: slot.zoomLink,
          notes: slot.notes,
          weekly: slot.weekly,
          until: slot.until,
        });
        if (!r.ok) {
          toast.error(r.error);
          return false;
        }
        toast.success("Session added");
        return true;
      }}
    >
      <Field label="Student" htmlFor="as-student">
        <Select value={who} onValueChange={setWho}>
          <SelectTrigger id="as-student" className="w-full">
            <SelectValue placeholder="Choose a student" />
          </SelectTrigger>
          <SelectContent>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id} className="min-h-11">
                {s.first_name} · {s.grade}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </SlotDialog>
  );
}
