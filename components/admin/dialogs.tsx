"use client";

import { useState, useTransition } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckRow, Field } from "@/components/shared/form-bits";
import { emailTutorLogin, type SlotInput } from "@/app/admin/actions";
import { etDate, etTime, shiftDate, todayEt } from "@/lib/time";
import type { ActionResult, Tutor } from "@/lib/types";

// ---------------------------------------------------------------------------
// Email: editable subject and body, sent through Resend
// ---------------------------------------------------------------------------

export function EmailDialog({
  open,
  onOpenChange,
  to,
  initial,
  title,
  onSend,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  to: string;
  initial: { subject: string; body: string };
  title: string;
  onSend: (subject: string, body: string) => Promise<ActionResult>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {open && <EmailBody to={to} initial={initial} title={title} onSend={onSend} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  );
}

function EmailBody({
  to,
  initial,
  title,
  onSend,
  onOpenChange,
}: {
  to: string;
  initial: { subject: string; body: string };
  title: string;
  onSend: (subject: string, body: string) => Promise<ActionResult>;
  onOpenChange: (o: boolean) => void;
}) {
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [pending, start] = useTransition();
  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          To <span className="font-semibold text-ink-900">{to}</span>. Replies come to hello@ivyup.org.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <Field label="Subject" htmlFor="em-subject">
          <Input id="em-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label="Message" htmlFor="em-body">
          <Textarea id="em-body" rows={12} value={body} onChange={(e) => setBody(e.target.value)} className="font-sans leading-relaxed" data-lenis-prevent />
        </Field>
      </div>
      <DialogFooter className="gap-2">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await onSend(subject, body);
              if (r.ok) {
                toast.success(`Email sent to ${to}`);
                onOpenChange(false);
              } else toast.error(r.error);
            })
          }
        >
          {pending ? "Sending…" : "Send email"}
        </Button>
      </DialogFooter>
    </>
  );
}

// ---------------------------------------------------------------------------
// Slot: date, time, length, Zoom link, notes (and weekly repeat for sessions)
// ---------------------------------------------------------------------------

const DURATIONS = [
  { v: "20", l: "20 minutes" },
  { v: "30", l: "30 minutes" },
  { v: "45", l: "45 minutes" },
  { v: "60", l: "1 hour" },
  { v: "90", l: "1.5 hours" },
  { v: "120", l: "2 hours" },
];

export type SlotDefaults = Partial<SlotInput> & { startsAt?: string; endsAt?: string };

function initialSlot(d: SlotDefaults | undefined, fallbackDuration: number): SlotInput {
  const duration =
    d?.startsAt && d?.endsAt ? Math.round((new Date(d.endsAt).getTime() - new Date(d.startsAt).getTime()) / 60000) : (d?.durationMin ?? fallbackDuration);
  return {
    date: d?.startsAt ? etDate(d.startsAt) : (d?.date ?? shiftDate(todayEt(), 1)),
    time: d?.startsAt ? etTime(d.startsAt) : (d?.time ?? "16:00"),
    durationMin: duration,
    zoomLink: d?.zoomLink ?? "",
    location: d?.location ?? "",
    notes: d?.notes ?? "",
    weekly: d?.weekly ?? false,
    until: d?.until ?? "",
  };
}

export function SlotFields({ value, onChange, allowWeekly }: { value: SlotInput; onChange: (v: SlotInput) => void; allowWeekly?: boolean }) {
  const set = <K extends keyof SlotInput>(k: K, v: SlotInput[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Date" htmlFor="slot-date">
          <Input id="slot-date" type="date" value={value.date} onChange={(e) => set("date", e.target.value)} className="tabular" />
        </Field>
        <Field label="Time (ET)" htmlFor="slot-time">
          <Input id="slot-time" type="time" step={300} value={value.time} onChange={(e) => set("time", e.target.value)} className="tabular" />
        </Field>
        <Field label="Length" htmlFor="slot-duration">
          <Select value={String(value.durationMin)} onValueChange={(v) => set("durationMin", Number(v))}>
            <SelectTrigger id="slot-duration" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map((d) => (
                <SelectItem key={d.v} value={d.v} className="min-h-11">
                  {d.l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      {allowWeekly && (
        <div className="flex flex-col gap-2 rounded-md bg-paper-2 px-4 py-2">
          <CheckRow checked={!!value.weekly} onCheckedChange={(v) => set("weekly", v)}>
            Repeat every week at this time
          </CheckRow>
          {value.weekly && (
            <Field label="Until" htmlFor="slot-until" optional optionalLabel="leave blank to keep repeating" className="pb-2 animate-in fade-in duration-200">
              <Input id="slot-until" type="date" value={value.until ?? ""} onChange={(e) => set("until", e.target.value)} className="tabular sm:w-56" />
            </Field>
          )}
        </div>
      )}
      <Field label="Zoom link" htmlFor="slot-zoom" optional optionalLabel="if applicable">
        <Input
          id="slot-zoom"
          type="url"
          inputMode="url"
          placeholder="https://zoom.us/j/…"
          value={value.zoomLink ?? ""}
          onChange={(e) => set("zoomLink", e.target.value)}
        />
      </Field>
      <Field label="Notes" htmlFor="slot-notes" optional>
        <Textarea id="slot-notes" rows={3} value={value.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
      </Field>
    </div>
  );
}

export function SlotDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  defaults,
  defaultDuration = 30,
  allowWeekly,
  onSubmit,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: React.ReactNode;
  submitLabel: string;
  defaults?: SlotDefaults;
  defaultDuration?: number;
  allowWeekly?: boolean;
  onSubmit: (slot: SlotInput) => Promise<boolean>;
  children?: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {open && (
          <SlotBody
            title={title}
            description={description}
            submitLabel={submitLabel}
            initial={initialSlot(defaults, defaultDuration)}
            allowWeekly={allowWeekly}
            onSubmit={onSubmit}
            onOpenChange={onOpenChange}
          >
            {children}
          </SlotBody>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SlotBody({
  title,
  description,
  submitLabel,
  initial,
  allowWeekly,
  onSubmit,
  onOpenChange,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  submitLabel: string;
  initial: SlotInput;
  allowWeekly?: boolean;
  onSubmit: (slot: SlotInput) => Promise<boolean>;
  onOpenChange: (o: boolean) => void;
  children?: React.ReactNode;
}) {
  const [slot, setSlot] = useState<SlotInput>(initial);
  const [pending, start] = useTransition();
  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>
      {children}
      <SlotFields value={slot} onChange={setSlot} allowWeekly={allowWeekly} />
      <DialogFooter className="gap-2">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              if (await onSubmit(slot)) onOpenChange(false);
            })
          }
        >
          {pending ? "Saving…" : submitLabel}
        </Button>
      </DialogFooter>
    </>
  );
}

// ---------------------------------------------------------------------------
// Tutor picker used by "IvyUp student" and reassign
// ---------------------------------------------------------------------------

export function TutorSelect({ tutors, value, onChange, id = "tutor-select" }: { tutors: Tutor[]; value: string; onChange: (v: string) => void; id?: string }) {
  const active = tutors.filter((t) => t.active);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={active.length ? "Choose a tutor" : "No tutors yet. Add one under Tutors."} />
      </SelectTrigger>
      <SelectContent>
        {active.map((t) => (
          <SelectItem key={t.id} value={t.id} className="min-h-11">
            {t.full_name}
            {t.school ? <span className="text-ink-600"> · {t.school}</span> : null}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------------------------------------------------------------------------
// Credentials: shown once after creating a tutor or resetting a password
// ---------------------------------------------------------------------------

export type Credentials = { tutorId: string; username: string; password: string; name: string; email: string | null };

export function CredentialsDialog({ creds, onClose }: { creds: Credentials | null; onClose: () => void }) {
  if (!creds) return null;
  return <CredentialsBody key={`${creds.tutorId}:${creds.password}`} creds={creds} onClose={onClose} />;
}

function CredentialsBody({ creds, onClose }: { creds: Credentials; onClose: () => void }) {
  const [sendTo, setSendTo] = useState(creds.email ?? "");
  const [sending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const loginUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/tutor/login`;
  const all = `IvyUp tutor login\n${loginUrl}\nUsername: ${creds.username}\nPassword: ${creds.password}`;

  return (
    <Dialog open={!!creds} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex size-11 items-center justify-center rounded-md bg-ivy-100 text-ivy-700">
            <KeyRound className="size-5" />
          </div>
          <DialogTitle>Login for {creds.name}</DialogTitle>
          <DialogDescription>Save or send these now. For security, the password won&apos;t be shown again (you can always reset it).</DialogDescription>
        </DialogHeader>
        <dl className="flex flex-col gap-2 rounded-md border border-line bg-paper p-4">
          <CredRow label="Sign-in page" value={loginUrl} />
          <CredRow label="Username" value={creds.username} mono />
          <CredRow label="Password" value={creds.password} mono />
        </dl>
        <CopyAll text={all} />
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <Field label="Email these to the tutor" htmlFor="cred-email">
            <div className="flex gap-2">
              <Input id="cred-email" type="email" value={sendTo} onChange={(e) => setSendTo(e.target.value)} placeholder="tutor@school.edu" />
              <Button
                variant="outline"
                disabled={!sendTo || sending || sent}
                onClick={() =>
                  start(async () => {
                    const r = await emailTutorLogin(creds.tutorId, creds.password, sendTo);
                    if (r.ok) {
                      setSent(true);
                      toast.success(`Login sent to ${sendTo}`);
                    } else toast.error(r.error);
                  })
                }
              >
                {sent ? "Sent" : sending ? "Sending…" : "Send"}
              </Button>
            </div>
          </Field>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CredRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-sm text-ink-600">{label}</dt>
      <dd className={mono ? "font-mono text-base text-ink-900 select-all" : "truncate text-sm text-ink-900"}>{value}</dd>
    </div>
  );
}

function CopyAll({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="text-ivy-700" /> : <Copy />}
      {copied ? "Copied" : "Copy login details"}
    </Button>
  );
}
