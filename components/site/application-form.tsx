"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckRow, ChoiceChip, Field, Honeypot, SuccessCheck, useIdempotencyKey } from "@/components/shared/form-bits";
import {
  EXPERIENCE_WITH,
  PRIOR_EXPERIENCE,
  REFERRAL_SOURCES,
  SCHOOL_YEARS,
  TUTOR_ACKS,
  TUTOR_GRADE_LEVELS,
  TUTOR_SETUP,
  TUTOR_SUBJECT_GROUPS,
  US_TIME_ZONES,
} from "@/lib/constants";
import { applicationSchema } from "@/lib/validation/application";
import { fieldErrorsFrom } from "@/lib/validation/shared";
import { submitApplication } from "@/app/(site)/actions";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "ivyup-application-draft-v1";

type State = {
  fullName: string;
  preferredName: string;
  email: string;
  phone: string;
  school: string;
  year: string;
  major: string;
  semesterState: string;
  timeZone: string;
  subjects: string[];
  gradeLevels: string[];
  satScore: string;
  actScore: string;
  apScores: string;
  weeklyAvailability: string;
  maxHours: string;
  maxStudents: string;
  unavailablePeriods: string;
  summerAvailability: string;
  setup: { laptop: boolean; webcam: boolean; quiet: boolean; stylus: boolean };
  priorExperience: string;
  experienceDetails: string;
  experienceWith: string[];
  bio: string;
  funFact: string;
  answerFirstSession: string;
  answerWhyIvyUp: string;
  ack_adult: boolean;
  ack_recorded: boolean;
  ack_background_check: boolean;
  ack_contractor: boolean;
  ack_non_solicit: boolean;
  referralSource: string;
  anythingElse: string;
  website: string;
};

const INITIAL: State = {
  fullName: "",
  preferredName: "",
  email: "",
  phone: "",
  school: "",
  year: "",
  major: "",
  semesterState: "",
  timeZone: "",
  subjects: [],
  gradeLevels: [],
  satScore: "",
  actScore: "",
  apScores: "",
  weeklyAvailability: "",
  maxHours: "",
  maxStudents: "",
  unavailablePeriods: "",
  summerAvailability: "",
  setup: { laptop: false, webcam: false, quiet: false, stylus: false },
  priorExperience: "",
  experienceDetails: "",
  experienceWith: [],
  bio: "",
  funFact: "",
  answerFirstSession: "",
  answerWhyIvyUp: "",
  ack_adult: false,
  ack_recorded: false,
  ack_background_check: false,
  ack_contractor: false,
  ack_non_solicit: false,
  referralSource: "",
  anythingElse: "",
  website: "",
};

const SECTIONS = [
  { id: "about", title: "About you", fields: ["fullName", "email", "phone", "school", "year", "major", "semesterState", "timeZone"] },
  { id: "subjects", title: "Subjects", fields: ["subjects", "gradeLevels"] },
  { id: "scores", title: "Scores", fields: [] },
  { id: "availability", title: "Weekly availability", fields: ["weeklyAvailability", "maxHours", "maxStudents"] },
  { id: "setup", title: "Your setup", fields: ["setup"] },
  { id: "experience", title: "Experience", fields: ["priorExperience"] },
  { id: "parents", title: "For parents", fields: ["bio"] },
  { id: "questions", title: "Two quick questions", fields: ["answerFirstSession", "answerWhyIvyUp"] },
  { id: "submit", title: "Before you submit", fields: ["ack_adult", "ack_recorded", "ack_background_check", "ack_contractor", "ack_non_solicit"] },
] as const;

function toPayload(s: State, key: string) {
  const blank = (v: string) => (v.trim() ? v : undefined);
  return {
    ...s,
    preferredName: blank(s.preferredName),
    satScore: blank(s.satScore),
    actScore: blank(s.actScore),
    apScores: blank(s.apScores),
    unavailablePeriods: blank(s.unavailablePeriods),
    summerAvailability: blank(s.summerAvailability),
    experienceDetails: blank(s.experienceDetails),
    funFact: blank(s.funFact),
    referralSource: blank(s.referralSource),
    anythingElse: blank(s.anythingElse),
    priorExperience: s.priorExperience || undefined,
    idempotencyKey: key,
  };
}

export function ApplicationForm() {
  const [s, setS] = useState<State>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [restored, setRestored] = useState(false);
  const [pending, start] = useTransition();
  const { key } = useIdempotencyKey();
  const topRef = useRef<HTMLDivElement>(null);

  // Restore and autosave a draft so a long application is never lost.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const draft = JSON.parse(raw) as Partial<State>;
          setS((p) => ({ ...p, ...draft, website: "" }));
          setRestored(true);
        }
      } catch {}
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, website: undefined }));
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [s]);

  const set = <K extends keyof State>(k: K, v: State[K]) => {
    setS((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };
  const toggleIn = (k: "subjects" | "gradeLevels" | "experienceWith", item: string) =>
    set(k, s[k].includes(item) ? s[k].filter((x) => x !== item) : [...s[k], item]);

  const sectionComplete = (fields: readonly string[]) =>
    fields.length === 0
      ? true
      : fields.every((f) => {
          const v = (s as Record<string, unknown>)[f];
          if (f === "setup") return s.setup.laptop && s.setup.webcam && s.setup.quiet;
          if (Array.isArray(v)) return v.length > 0;
          if (typeof v === "boolean") return v;
          return typeof v === "string" && v.trim().length > 0;
        });

  const allAcks = TUTOR_ACKS.every((a) => s[a.key]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = toPayload(s, key);
    const parsed = applicationSchema.safeParse(payload);
    if (!parsed.success) {
      const errs = fieldErrorsFrom(parsed.error);
      setErrors(errs);
      const first = SECTIONS.find((sec) => sec.fields.some((f) => errs[f]));
      if (first) document.getElementById(first.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      toast.error("A few answers need attention. They're highlighted below.");
      return;
    }
    start(async () => {
      const r = await submitApplication(payload);
      if (r.ok) {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
        setDone(true);
        topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        if (r.fieldErrors) setErrors(r.fieldErrors);
        toast.error(r.error);
      }
    });
  }

  if (done) {
    return (
      <div ref={topRef} className="mx-auto flex max-w-2xl scroll-mt-32 flex-col gap-6 py-16 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <SuccessCheck />
        <h2 className="font-display text-4xl text-ink-900">Application received. Thank you, {s.preferredName || s.fullName.split(" ")[0]}.</h2>
        <p className="measure text-lg text-ink-600">
          We read every application. If it&apos;s a fit, we&apos;ll email {s.email} to schedule a short interview.
        </p>
        <Link href="/" className="w-fit text-sm font-semibold text-ivy-700 underline decoration-ivy-200 decoration-2 underline-offset-4">
          Back to the home page
        </Link>
      </div>
    );
  }

  const err = (k: string) => errors[k];

  return (
    <div ref={topRef} className="grid scroll-mt-32 gap-12 lg:grid-cols-[220px_1fr] lg:gap-16">
      {/* Section index */}
      <nav aria-label="Application sections" className="hidden lg:block">
        <ol className="sticky top-32 flex flex-col gap-1">
          {SECTIONS.map((sec) => {
            const complete = sectionComplete(sec.fields);
            return (
              <li key={sec.id}>
                <a href={`#${sec.id}`} className="flex min-h-11 items-center gap-3 rounded-md px-2 text-sm text-ink-600 transition-colors hover:text-ink-900">
                  <span
                    className={cn(
                      "size-2 rounded-full transition-colors duration-300",
                      complete && sec.fields.length > 0 ? "bg-ivy-700" : "bg-line",
                    )}
                  />
                  {sec.title}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-16">
        <Honeypot value={s.website} onChange={(v) => set("website", v)} />
        {restored && (
          <p className="rounded-md bg-ivy-100 px-4 py-2 text-sm text-ivy-900 animate-in fade-in duration-300">
            We restored the answers you started earlier on this device.
          </p>
        )}

        <Section id="about" title="About you">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Full name" htmlFor="fullName" error={err("fullName")}>
              <Input id="fullName" autoComplete="name" value={s.fullName} onChange={(e) => set("fullName", e.target.value)} aria-invalid={!!err("fullName")} />
            </Field>
            <Field label="Preferred name" htmlFor="preferredName" optional>
              <Input id="preferredName" autoComplete="nickname" value={s.preferredName} onChange={(e) => set("preferredName", e.target.value)} />
            </Field>
            <Field label="Email" htmlFor="email" error={err("email")}>
              <Input id="email" type="email" autoComplete="email" value={s.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!err("email")} />
            </Field>
            <Field label="Phone" htmlFor="phone" error={err("phone")}>
              <Input id="phone" type="tel" autoComplete="tel" value={s.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={!!err("phone")} />
            </Field>
            <Field label="School" htmlFor="school" error={err("school")}>
              <Input id="school" list="ivy-schools" autoComplete="organization" value={s.school} onChange={(e) => set("school", e.target.value)} aria-invalid={!!err("school")} />
              <datalist id="ivy-schools">
                {["Brown University", "Columbia University", "Cornell University", "Dartmouth College", "Harvard University", "Princeton University", "University of Pennsylvania", "Yale University"].map((x) => (
                  <option key={x} value={x} />
                ))}
              </datalist>
            </Field>
            <Field label="Year" htmlFor="year" error={err("year")}>
              <SimpleSelect id="year" value={s.year} onChange={(v) => set("year", v)} options={SCHOOL_YEARS} placeholder="Choose your year" invalid={!!err("year")} />
            </Field>
            <Field label="Major" htmlFor="major" error={err("major")}>
              <Input id="major" value={s.major} onChange={(e) => set("major", e.target.value)} aria-invalid={!!err("major")} />
            </Field>
            <Field label="State where you'll be during the semester" htmlFor="semesterState" error={err("semesterState")}>
              <Input id="semesterState" autoComplete="address-level1" value={s.semesterState} onChange={(e) => set("semesterState", e.target.value)} aria-invalid={!!err("semesterState")} />
            </Field>
            <Field label="Time zone" htmlFor="timeZone" error={err("timeZone")}>
              <SimpleSelect id="timeZone" value={s.timeZone} onChange={(v) => set("timeZone", v)} options={US_TIME_ZONES} placeholder="Choose a time zone" invalid={!!err("timeZone")} />
            </Field>
          </div>
        </Section>

        <Section id="subjects" title="Subjects" intro="Click every subject you could teach. Click again to remove one.">
          <Field label={<span className="sr-only">Subjects</span>} error={err("subjects")}>
            <div className="flex flex-col gap-8">
              {TUTOR_SUBJECT_GROUPS.map((g) => (
                <div key={g.label} className="flex flex-col gap-4">
                  <p className="eyebrow text-ink-600">{g.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {g.items.map((item) => (
                      <ChoiceChip key={item} selected={s.subjects.includes(item)} onToggle={() => toggleIn("subjects", item)}>
                        {item}
                      </ChoiceChip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Field>
          <Field label="Grade levels you're comfortable teaching" error={err("gradeLevels")}>
            <div className="flex flex-wrap gap-2">
              {TUTOR_GRADE_LEVELS.map((g) => (
                <ChoiceChip key={g} selected={s.gradeLevels.includes(g)} onToggle={() => toggleIn("gradeLevels", g)}>
                  {g}
                </ChoiceChip>
              ))}
            </div>
          </Field>
        </Section>

        <Section id="scores" title="Scores" intro="Optional, but parents care about these.">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="SAT" htmlFor="satScore" optional>
              <Input id="satScore" inputMode="numeric" className="tabular" value={s.satScore} onChange={(e) => set("satScore", e.target.value)} placeholder="e.g. 1560" />
            </Field>
            <Field label="ACT" htmlFor="actScore" optional>
              <Input id="actScore" inputMode="numeric" className="tabular" value={s.actScore} onChange={(e) => set("actScore", e.target.value)} placeholder="e.g. 35" />
            </Field>
          </div>
          <Field label="AP exams and scores" htmlFor="apScores" optional>
            <Textarea id="apScores" rows={3} value={s.apScores} onChange={(e) => set("apScores", e.target.value)} placeholder="e.g. Calculus BC 5, Chemistry 5, US History 4" />
          </Field>
        </Section>

        <Section id="availability" title="Weekly availability" intro="Your usual week. We'll ask about exceptions below.">
          <Field label="Type the times you're free every week, in Eastern Time. Include am/pm." htmlFor="weeklyAvailability" error={err("weeklyAvailability")}>
            <Textarea id="weeklyAvailability" rows={4} value={s.weeklyAvailability} onChange={(e) => set("weeklyAvailability", e.target.value)} placeholder={"Mon 4pm–8pm\nWed 6pm–9pm\nSat 10am–2pm"} aria-invalid={!!err("weeklyAvailability")} />
          </Field>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Maximum hours of tutoring per week" htmlFor="maxHours" error={err("maxHours")}>
              <Input id="maxHours" type="number" min={1} max={40} inputMode="numeric" className="tabular" value={s.maxHours} onChange={(e) => set("maxHours", e.target.value)} aria-invalid={!!err("maxHours")} />
            </Field>
            <Field label="Maximum number of students you'd take at once" htmlFor="maxStudents" error={err("maxStudents")}>
              <Input id="maxStudents" type="number" min={1} max={30} inputMode="numeric" className="tabular" value={s.maxStudents} onChange={(e) => set("maxStudents", e.target.value)} aria-invalid={!!err("maxStudents")} />
            </Field>
          </div>
          <Field label="Known unavailable periods" htmlFor="unavailablePeriods" optional hint="Finals, breaks, travel.">
            <Textarea id="unavailablePeriods" rows={2} value={s.unavailablePeriods} onChange={(e) => set("unavailablePeriods", e.target.value)} />
          </Field>
          <Field label="Summer availability" htmlFor="summerAvailability" optional>
            <Textarea id="summerAvailability" rows={2} value={s.summerAvailability} onChange={(e) => set("summerAvailability", e.target.value)} />
          </Field>
        </Section>

        <Section id="setup" title="Your setup" intro="Sessions happen over video and are recorded.">
          <Field label={<span className="sr-only">Setup</span>} error={err("setup")}>
            <div className="flex flex-col">
              {TUTOR_SETUP.map((item) => (
                <CheckRow
                  key={item.key}
                  checked={s.setup[item.key]}
                  onCheckedChange={(v) => {
                    set("setup", { ...s.setup, [item.key]: v });
                  }}
                >
                  {item.label}
                </CheckRow>
              ))}
            </div>
          </Field>
        </Section>

        <Section id="experience" title="Experience">
          <Field label="Prior tutoring or teaching" htmlFor="priorExperience" error={err("priorExperience")}>
            <SimpleSelect id="priorExperience" value={s.priorExperience} onChange={(v) => set("priorExperience", v)} options={PRIOR_EXPERIENCE} placeholder="Choose one" invalid={!!err("priorExperience")} />
          </Field>
          <Field label="Tell us about it" htmlFor="experienceDetails" optional>
            <Textarea id="experienceDetails" rows={4} value={s.experienceDetails} onChange={(e) => set("experienceDetails", e.target.value)} />
          </Field>
          <Field label="Experience with" optional>
            <div className="flex flex-wrap gap-2">
              {EXPERIENCE_WITH.map((x) => (
                <ChoiceChip key={x} selected={s.experienceWith.includes(x)} onToggle={() => toggleIn("experienceWith", x)}>
                  {x}
                </ChoiceChip>
              ))}
            </div>
          </Field>
        </Section>

        <Section id="parents" title="For parents" intro="We'll share this with families when we suggest you.">
          <Field label="Short bio" htmlFor="bio" hint="3 to 4 sentences: your background and what you're like as a tutor." error={err("bio")}>
            <Textarea id="bio" rows={5} value={s.bio} onChange={(e) => set("bio", e.target.value)} aria-invalid={!!err("bio")} />
          </Field>
          <Field label="A fun fact" htmlFor="funFact" optional>
            <Input id="funFact" value={s.funFact} onChange={(e) => set("funFact", e.target.value)} />
          </Field>
        </Section>

        <Section id="questions" title="Two quick questions">
          <Field
            label="A student says they hate math and keep getting stuck on the same type of problem. How would you approach the first session?"
            htmlFor="answerFirstSession"
            hint={<CharCount value={s.answerFirstSession} max={500} label="A few sentences is plenty" />}
            error={err("answerFirstSession")}
          >
            <Textarea id="answerFirstSession" rows={5} maxLength={500} value={s.answerFirstSession} onChange={(e) => set("answerFirstSession", e.target.value)} aria-invalid={!!err("answerFirstSession")} />
          </Field>
          <Field label="Why do you want to tutor with IvyUp?" htmlFor="answerWhyIvyUp" error={err("answerWhyIvyUp")}>
            <Textarea id="answerWhyIvyUp" rows={4} value={s.answerWhyIvyUp} onChange={(e) => set("answerWhyIvyUp", e.target.value)} aria-invalid={!!err("answerWhyIvyUp")} />
          </Field>
        </Section>

        <Section id="submit" title="Before you submit">
          <div className="flex flex-col">
            {TUTOR_ACKS.map((a) => (
              <CheckRow
                key={a.key}
                checked={s[a.key]}
                onCheckedChange={(v) => set(a.key, v)}
                invalid={!!err(a.key)}
                hint={a.details ? <Details text={a.details} /> : undefined}
              >
                {a.label}
              </CheckRow>
            ))}
          </div>
          <p className="text-sm text-ink-600">These are acknowledgments only. If we move forward, you&apos;ll sign a full tutor agreement.</p>
          <Field label="How did you hear about us?" htmlFor="referralSource" optional>
            <SimpleSelect id="referralSource" value={s.referralSource} onChange={(v) => set("referralSource", v)} options={REFERRAL_SOURCES} placeholder="Choose one" />
          </Field>
          <Field label="Anything else we should know?" htmlFor="anythingElse" optional>
            <Textarea id="anythingElse" rows={3} value={s.anythingElse} onChange={(e) => set("anythingElse", e.target.value)} />
          </Field>
        </Section>

        <div className="flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-600">
            {allAcks ? "Ready when you are." : "Check all five acknowledgments above to submit."}
          </p>
          <Button
            type="submit"
            size="lg"
            disabled={pending || !allAcks}
            className={cn("w-full sm:w-auto", !allAcks && "bg-line text-ink-600 shadow-none")}
          >
            {pending ? "Submitting…" : "Submit application"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-32 flex-col gap-6">
      <div className="flex flex-col gap-2 border-t-2 border-ink-900 pt-6">
        <h2 id={`${id}-title`} className="font-display text-3xl text-ink-900">
          {title}
        </h2>
        {intro && <p className="text-ink-600">{intro}</p>}
      </div>
      {children}
    </section>
  );
}

function SimpleSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder: string;
  invalid?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full" aria-invalid={invalid}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o} className="min-h-11">
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Details({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex min-h-8 items-center gap-1 text-sm font-semibold text-ivy-700"
      >
        Details
        <ChevronDown className={cn("size-4 transition-transform duration-200 ease-soft", open && "rotate-180")} />
      </button>
      <div className={cn("grid transition-[grid-template-rows,opacity] duration-200 ease-soft", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <p className="measure overflow-hidden text-sm text-ink-600">{text}</p>
      </div>
    </div>
  );
}

function CharCount({ value, max, label }: { value: string; max: number; label: string }) {
  return (
    <span className="flex justify-between gap-4">
      <span>{label} ({max} characters max).</span>
      <span className={cn("tabular", value.length > max * 0.9 && "font-semibold text-brass-700")}>
        {value.length}/{max}
      </span>
    </span>
  );
}
