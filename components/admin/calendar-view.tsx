"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, ExternalLink, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DetailRow, EmailLine, PhoneLine } from "@/components/admin/ui";
import { SlotDialog } from "@/components/admin/dialogs";
import { deleteEvent, updateEvent } from "@/app/admin/actions";
import { expandOccurrences, fmt, fmtRange, todayEt } from "@/lib/time";
import type { CalendarEvent, EventType, Occurrence, StudentWithFamily, Tutor, TutorApplication } from "@/lib/types";
import { cn } from "@/lib/utils";

export type CalendarPeople = {
  students: Record<string, StudentWithFamily>;
  applications: Record<string, Pick<TutorApplication, "id" | "full_name" | "email" | "phone" | "school" | "year">>;
  tutors: Record<string, Pick<Tutor, "id" | "full_name">>;
};

const TYPE_STYLE: Record<EventType, { pill: string; dot: string; label: string }> = {
  consultation: { pill: "bg-ivy-700 text-paper hover:bg-ivy-800", dot: "bg-ivy-700", label: "Consultation" },
  interview: { pill: "bg-brass-100 text-brass-700 hover:bg-brass-100/70 ring-1 ring-brass-500/40", dot: "bg-brass-500", label: "Interview" },
  session: { pill: "bg-surface text-ink-900 ring-1 ring-ink-400/60 hover:bg-paper-2", dot: "bg-ink-400", label: "Session" },
};

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7am – 9pm rows
const ROW = 48; // px per hour

function eventTitle(o: Occurrence, people: CalendarPeople) {
  const e = o.event;
  if (e.type === "consultation" && e.student_id) {
    const s = people.students[e.student_id];
    return s ? `${s.family?.parent_name ?? "Family"} · ${s.first_name}` : (e.title ?? "Consultation");
  }
  if (e.type === "interview" && e.application_id) return people.applications[e.application_id]?.full_name ?? e.title ?? "Interview";
  if (e.type === "session" && e.student_id) {
    const s = people.students[e.student_id];
    const t = e.tutor_id ? people.tutors[e.tutor_id]?.full_name.split(" ")[0] : null;
    return s ? `${s.first_name}${t ? ` with ${t}` : ""}` : (e.title ?? "Session");
  }
  return e.title ?? TYPE_STYLE[e.type].label;
}

export function CalendarView({ events, people }: { events: CalendarEvent[]; people: CalendarPeople }) {
  const today = todayEt();
  const [view, setView] = useState<"month" | "week" | "agenda">("month");
  const [cursor, setCursor] = useState(() => parseISO(`${today}T12:00:00`));
  const [selected, setSelected] = useState<Occurrence | null>(null);
  const [dir, setDir] = useState(0);

  const range = useMemo(() => {
    if (view === "week") {
      const from = startOfWeek(cursor);
      return { from, to: endOfWeek(cursor) };
    }
    if (view === "agenda") return { from: parseISO(`${today}T12:00:00`), to: addDays(parseISO(`${today}T12:00:00`), 60) };
    return { from: startOfWeek(startOfMonth(cursor)), to: endOfWeek(endOfMonth(cursor)) };
  }, [cursor, view, today]);

  const occurrences = useMemo(
    () => expandOccurrences(events, format(range.from, "yyyy-MM-dd"), format(range.to, "yyyy-MM-dd")),
    [events, range],
  );
  const byDate = useMemo(() => {
    const m: Record<string, Occurrence[]> = {};
    for (const o of occurrences) (m[o.date] ??= []).push(o);
    return m;
  }, [occurrences]);

  const upcoming = useMemo(
    () => expandOccurrences(events, today, format(addDays(parseISO(`${today}T12:00:00`), 14), "yyyy-MM-dd")).filter((o) => new Date(o.ends_at) > new Date()).slice(0, 12),
    [events, today],
  );

  function shift(n: number) {
    setDir(n);
    setCursor((c) => (view === "week" ? addWeeks(c, n) : addMonths(c, n)));
  }

  const label = view === "week" ? `${format(range.from, "MMM d")} – ${format(range.to, "MMM d, yyyy")}` : view === "agenda" ? "Next 60 days" : format(cursor, "MMMM yyyy");

  return (
    <div className="grid gap-8 px-4 pb-8 sm:px-8 xl:grid-cols-[1fr_320px]">
      <section className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {view !== "agenda" && (
              <>
                <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Previous">
                  <ChevronLeft />
                </Button>
                <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Next">
                  <ChevronRight />
                </Button>
              </>
            )}
            <h2 className="ml-2 font-display text-2xl text-ink-900 tabular" aria-live="polite">
              {label}
            </h2>
            {view !== "agenda" && (
              <Button variant="ghost" size="sm" onClick={() => setCursor(parseISO(`${today}T12:00:00`))}>
                Today
              </Button>
            )}
          </div>
          <div role="tablist" aria-label="Calendar view" className="flex rounded-md bg-paper-2 p-1">
            {(["month", "week", "agenda"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={cn(
                  "min-h-9 rounded-sm px-4 text-sm font-semibold capitalize transition-[background-color,color,box-shadow] duration-200",
                  view === v ? "bg-surface text-ink-900 shadow-lift" : "text-ink-600 hover:text-ink-900",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <Legend />

        <div key={`${view}-${label}`} className={cn("animate-in fade-in duration-300", dir > 0 && "slide-in-from-right-2", dir < 0 && "slide-in-from-left-2")}>
          {view === "month" && <MonthGrid cursor={cursor} from={range.from} to={range.to} byDate={byDate} today={today} people={people} onSelect={setSelected} />}
          {view === "week" && <WeekGrid from={range.from} byDate={byDate} today={today} people={people} onSelect={setSelected} />}
          {view === "agenda" && <Agenda occurrences={occurrences} people={people} onSelect={setSelected} />}
        </div>
      </section>

      <aside className="hidden flex-col gap-4 xl:flex">
        <h2 className="eyebrow text-ink-600">Coming up</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-ink-600">Nothing in the next two weeks.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
            {upcoming.map((o) => (
              <li key={o.key}>
                <button type="button" onClick={() => setSelected(o)} className="flex min-h-14 w-full items-start gap-4 px-4 py-2 text-left transition-colors hover:bg-paper-2">
                  <span className={cn("mt-2 size-2 shrink-0 rounded-full", TYPE_STYLE[o.event.type].dot)} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold text-ink-900">{eventTitle(o, people)}</span>
                    <span className="text-xs text-ink-600 tabular">
                      {fmt(o.starts_at, "EEE MMM d")} · {fmtRange(o.starts_at, o.ends_at)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <EventSheet occurrence={selected} people={people} onClose={() => setSelected(null)} />
    </div>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-4 text-xs text-ink-600">
      {(Object.keys(TYPE_STYLE) as EventType[]).map((t) => (
        <li key={t} className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", TYPE_STYLE[t].dot)} />
          {TYPE_STYLE[t].label}
        </li>
      ))}
    </ul>
  );
}

function Pill({ o, people, onSelect, compact }: { o: Occurrence; people: CalendarPeople; onSelect: (o: Occurrence) => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(o);
      }}
      className={cn(
        "flex w-full min-w-0 items-center gap-1 rounded-sm px-2 text-left text-xs font-semibold transition-[background-color,transform] duration-150 active:scale-[0.98]",
        compact ? "min-h-6" : "min-h-8",
        TYPE_STYLE[o.event.type].pill,
      )}
    >
      <span className="shrink-0 tabular opacity-80">{fmt(o.starts_at, "h:mma").toLowerCase().replace(":00", "")}</span>
      <span className="truncate">{eventTitle(o, people)}</span>
    </button>
  );
}

function MonthGrid({
  cursor,
  from,
  to,
  byDate,
  today,
  people,
  onSelect,
}: {
  cursor: Date;
  from: Date;
  to: Date;
  byDate: Record<string, Occurrence[]>;
  today: string;
  people: CalendarPeople;
  onSelect: (o: Occurrence) => void;
}) {
  const days: Date[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  const [openDay, setOpenDay] = useState<string | null>(null);
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="grid grid-cols-7 border-b border-line bg-paper-2 text-center text-xs font-semibold text-ink-600">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const items = byDate[key] ?? [];
          const isToday = key === today;
          const muted = !isSameMonth(d, cursor);
          return (
            <div
              key={key}
              className={cn("relative flex min-h-24 flex-col gap-1 border-r border-b border-line p-1 sm:min-h-32 sm:p-2 [&:nth-child(7n)]:border-r-0", muted && "bg-paper/60")}
            >
              <button
                type="button"
                onClick={() => items.length && setOpenDay(key)}
                className={cn(
                  "flex size-7 items-center justify-center self-start rounded-full text-xs font-semibold tabular",
                  isToday ? "bg-ivy-700 text-paper" : muted ? "text-ink-400" : "text-ink-900",
                )}
                aria-label={`${format(d, "EEEE, MMMM d")}${items.length ? `, ${items.length} events` : ""}`}
              >
                {format(d, "d")}
              </button>
              {/* Dots on phones, pills from small screens up */}
              <div className="flex flex-wrap gap-1 sm:hidden">
                {items.slice(0, 4).map((o) => (
                  <span key={o.key} className={cn("size-1.5 rounded-full", TYPE_STYLE[o.event.type].dot)} />
                ))}
              </div>
              <div className="hidden flex-col gap-1 sm:flex">
                {items.slice(0, 3).map((o) => (
                  <Pill key={o.key} o={o} people={people} onSelect={onSelect} compact />
                ))}
                {items.length > 3 && (
                  <button type="button" onClick={() => setOpenDay(key)} className="min-h-6 text-left text-xs font-semibold text-ink-600 hover:text-ink-900">
                    +{items.length - 3} more
                  </button>
                )}
              </div>
              {items.length > 0 && <button type="button" className="absolute inset-0 sm:hidden" aria-hidden tabIndex={-1} onClick={() => setOpenDay(key)} />}
            </div>
          );
        })}
      </div>
      <Sheet open={!!openDay} onOpenChange={(o) => !o && setOpenDay(null)}>
        <SheetContent side="bottom" className="mx-auto max-w-xl" data-lenis-prevent>
          <SheetHeader>
            <SheetTitle>{openDay ? format(parseISO(`${openDay}T12:00:00`), "EEEE, MMMM d") : ""}</SheetTitle>
            <SheetDescription className="sr-only">Events on this day</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2 px-6 pb-8">
            {(openDay ? byDate[openDay] ?? [] : []).map((o) => (
              <Pill
                key={o.key}
                o={o}
                people={people}
                onSelect={(x) => {
                  setOpenDay(null);
                  onSelect(x);
                }}
              />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function WeekGrid({ from, byDate, today, people, onSelect }: { from: Date; byDate: Record<string, Occurrence[]>; today: string; people: CalendarPeople; onSelect: (o: Occurrence) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface" data-lenis-prevent>
      <div className="grid min-w-[720px] grid-cols-[56px_repeat(7,1fr)]">
        <div className="border-b border-line bg-paper-2" />
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          return (
            <div key={key} className={cn("border-b border-l border-line bg-paper-2 py-2 text-center text-xs font-semibold", key === today ? "text-ivy-700" : "text-ink-600")}>
              {format(d, "EEE")} <span className="tabular">{format(d, "d")}</span>
            </div>
          );
        })}
        <div className="relative">
          {HOURS.map((h) => (
            <div key={h} style={{ height: ROW }} className="pr-2 text-right text-xs text-ink-400 tabular">
              {format(new Date(2000, 0, 1, h), "ha").toLowerCase()}
            </div>
          ))}
        </div>
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          return (
            <div key={key} className="relative border-l border-line" style={{ height: ROW * HOURS.length }}>
              {HOURS.map((h) => (
                <div key={h} style={{ top: (h - HOURS[0]) * ROW }} className="absolute inset-x-0 border-t border-line/60" />
              ))}
              {(byDate[key] ?? []).map((o) => {
                const [hh, mm] = fmt(o.starts_at, "H:m").split(":").map(Number);
                const minutes = (new Date(o.ends_at).getTime() - new Date(o.starts_at).getTime()) / 60000;
                const top = Math.max(0, (hh - HOURS[0]) * ROW + (mm / 60) * ROW);
                return (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => onSelect(o)}
                    style={{ top, height: Math.max(24, (minutes / 60) * ROW - 2) }}
                    className={cn("absolute inset-x-1 flex flex-col overflow-hidden rounded-sm px-2 py-1 text-left text-xs font-semibold transition-transform duration-150 active:scale-[0.98]", TYPE_STYLE[o.event.type].pill)}
                  >
                    <span className="truncate">{eventTitle(o, people)}</span>
                    <span className="truncate font-normal opacity-80 tabular">{fmtRange(o.starts_at, o.ends_at)}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Agenda({ occurrences, people, onSelect }: { occurrences: Occurrence[]; people: CalendarPeople; onSelect: (o: Occurrence) => void }) {
  const future = occurrences.filter((o) => new Date(o.ends_at) > new Date());
  if (future.length === 0) return <p className="rounded-xl border border-dashed border-line px-6 py-12 text-ink-600">Nothing scheduled in the next 60 days.</p>;
  const groups: Record<string, Occurrence[]> = {};
  for (const o of future) (groups[o.date] ??= []).push(o);
  return (
    <div className="flex flex-col gap-6">
      {Object.entries(groups).map(([date, items]) => (
        <section key={date} className="flex flex-col gap-2">
          <h3 className="eyebrow text-ink-600">{format(parseISO(`${date}T12:00:00`), "EEEE, MMMM d")}</h3>
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
            {items.map((o) => (
              <li key={o.key}>
                <button type="button" onClick={() => onSelect(o)} className="flex min-h-14 w-full items-center gap-4 px-4 py-2 text-left transition-colors hover:bg-paper-2">
                  <span className="w-28 shrink-0 text-sm text-ink-600 tabular">{fmtRange(o.starts_at, o.ends_at)}</span>
                  <span className={cn("size-2 shrink-0 rounded-full", TYPE_STYLE[o.event.type].dot)} />
                  <span className="truncate font-semibold text-ink-900">{eventTitle(o, people)}</span>
                  <span className="ml-auto hidden text-xs text-ink-600 sm:inline">{TYPE_STYLE[o.event.type].label}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function EventSheet({ occurrence: o, people, onClose }: { occurrence: Occurrence | null; people: CalendarPeople; onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const e = o?.event;
  const student = e?.student_id ? people.students[e.student_id] : undefined;
  const app = e?.application_id ? people.applications[e.application_id] : undefined;
  const tutor = e?.tutor_id ? people.tutors[e.tutor_id] : undefined;

  return (
    <Sheet open={!!o} onOpenChange={(x) => !x && onClose()}>
      <SheetContent side="right" className="overflow-y-auto" data-lenis-prevent>
        {o && e && (
          <>
            <SheetHeader className="gap-2">
              <p className="eyebrow flex items-center gap-2 text-brass-700">
                <span className={cn("size-2 rounded-full", TYPE_STYLE[e.type].dot)} />
                {TYPE_STYLE[e.type].label}
                {e.recurrence === "weekly" && (
                  <span className="inline-flex items-center gap-1 text-ink-600">
                    <Repeat className="size-3" /> Weekly
                  </span>
                )}
              </p>
              <SheetTitle className="pr-12 text-3xl">{eventTitle(o, people)}</SheetTitle>
              <SheetDescription className="text-base text-ink-900 tabular">
                {fmt(o.starts_at, "EEEE, MMMM d")} · {fmtRange(o.starts_at, o.ends_at)} ET
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-8 px-6 pb-8">
              <div className="flex flex-wrap gap-2">
                {e.zoom_link && (
                  <Button asChild>
                    <a href={e.zoom_link} target="_blank" rel="noreferrer">
                      <ExternalLink /> Open Zoom
                    </a>
                  </Button>
                )}
                <Button variant={e.zoom_link ? "outline" : "default"} onClick={() => setEditing(true)}>
                  Edit time, link, or notes
                </Button>
                <Button
                  variant="destructive"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      if (!window.confirm(e.recurrence === "weekly" ? "Delete every week of this session?" : "Delete this event?")) return;
                      const r = await deleteEvent(e.id);
                      if (!r.ok) return void toast.error(r.error);
                      toast("Event deleted");
                      onClose();
                    })
                  }
                >
                  <Trash2 /> Delete
                </Button>
              </div>

              <dl>
                <DetailRow label="Zoom link">
                  {e.zoom_link ? (
                    <a href={e.zoom_link} target="_blank" rel="noreferrer" className="text-ivy-700 underline underline-offset-4">
                      {e.zoom_link}
                    </a>
                  ) : null}
                </DetailRow>
                <DetailRow label="Notes">{e.notes ? <span className="whitespace-pre-wrap">{e.notes}</span> : null}</DetailRow>
                {tutor && <DetailRow label="Tutor">{tutor.full_name}</DetailRow>}
              </dl>

              {student && (
                <section className="flex flex-col gap-2">
                  <h3 className="eyebrow text-ink-600">Family</h3>
                  <dl>
                    <DetailRow label="Student">
                      {student.first_name} · {student.grade}
                    </DetailRow>
                    <DetailRow label="Tests">{[...student.subjects.filter((x) => x !== "AP exam"), ...student.ap_exams].join(", ")}</DetailRow>
                    {student.family && (
                      <>
                        <DetailRow label="Parent">{student.family.parent_name}</DetailRow>
                        <DetailRow label="Phone">
                          <PhoneLine phone={student.family.parent_phone} />
                        </DetailRow>
                        <DetailRow label="Email">
                          <EmailLine email={student.family.parent_email} />
                        </DetailRow>
                      </>
                    )}
                    <DetailRow label="Preferred tutor">{student.preferred_tutor}</DetailRow>
                  </dl>
                  <Link href={`/admin/prospects?student=${student.id}`} className="min-h-11 w-fit py-2 text-sm font-semibold text-ivy-700 hover:underline">
                    Open full profile
                  </Link>
                </section>
              )}

              {app && (
                <section className="flex flex-col gap-2">
                  <h3 className="eyebrow text-ink-600">Applicant</h3>
                  <dl>
                    <DetailRow label="Name">{app.full_name}</DetailRow>
                    <DetailRow label="School">
                      {app.school} · {app.year}
                    </DetailRow>
                    <DetailRow label="Phone">
                      <PhoneLine phone={app.phone} />
                    </DetailRow>
                    <DetailRow label="Email">
                      <EmailLine email={app.email} />
                    </DetailRow>
                  </dl>
                  <Link href={`/admin/tutors?app=${app.id}`} className="min-h-11 w-fit py-2 text-sm font-semibold text-ivy-700 hover:underline">
                    Open application
                  </Link>
                </section>
              )}
            </div>

            <SlotDialog
              open={editing}
              onOpenChange={setEditing}
              title={`Edit ${TYPE_STYLE[e.type].label.toLowerCase()}`}
              description={e.recurrence === "weekly" ? "Changes apply to every week of this session." : undefined}
              submitLabel="Save changes"
              allowWeekly={e.type === "session"}
              defaults={{
                startsAt: e.starts_at,
                endsAt: e.ends_at,
                zoomLink: e.zoom_link ?? "",
                notes: e.notes ?? "",
                weekly: e.recurrence === "weekly",
                until: e.recurrence_until ?? "",
              }}
              onSubmit={async (slot) => {
                const r = await updateEvent(e.id, slot);
                if (!r.ok) {
                  toast.error(r.error);
                  return false;
                }
                toast.success("Saved");
                onClose();
                return true;
              }}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
