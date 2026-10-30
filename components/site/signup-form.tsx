"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, ChevronsUpDown, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckRow, ChoiceChip, Field, Honeypot, SuccessCheck, useIdempotencyKey } from "@/components/shared/form-bits";
import { AP_EXAMS, GRADES, TEST_DESCRIPTIONS, TESTS, type TestName } from "@/lib/constants";
import { signupSchema } from "@/lib/validation/signup";
import { fieldErrorsFrom } from "@/lib/validation/shared";
import { submitSignup } from "@/app/(site)/actions";
import { cn } from "@/lib/utils";

type ApExam = (typeof AP_EXAMS)[number];

type State = {
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  parentSms: boolean;
  studentFirstName: string;
  studentGrade: string;
  studentPhone: string;
  studentEmail: string;
  studentEmailUpdates: boolean;
  studentTextUpdates: boolean;
  tests: TestName[];
  apExams: ApExam[];
  preferredTutor: string;
  consentGuardian: boolean;
  consentContact: boolean;
  website: string;
};

const INITIAL: State = {
  parentName: "",
  parentPhone: "",
  parentEmail: "",
  parentSms: false,
  studentFirstName: "",
  studentGrade: "",
  studentPhone: "",
  studentEmail: "",
  studentEmailUpdates: false,
  studentTextUpdates: false,
  tests: [],
  apExams: [],
  preferredTutor: "",
  consentGuardian: false,
  consentContact: false,
  website: "",
};

const STEPS = [
  { title: "About you", fields: ["parentName", "parentPhone", "parentEmail"] },
  { title: "Your student", fields: ["studentFirstName", "studentGrade", "studentPhone", "studentEmail"] },
  { title: "Tests", fields: ["tests", "apExams", "preferredTutor"] },
  { title: "Confirm", fields: ["consentGuardian", "consentContact"] },
] as const;

export function SignupForm() {
  const [s, setS] = useState<State>(INITIAL);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const { key } = useIdempotencyKey();
  const topRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof State>(k: K, v: State[K]) => {
    setS((prev) => ({ ...prev, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  function payload() {
    return {
      ...s,
      studentGrade: s.studentGrade || undefined,
      studentPhone: s.studentPhone || undefined,
      studentEmail: s.studentEmail || undefined,
      preferredTutor: s.preferredTutor || undefined,
      idempotencyKey: key,
    };
  }

  function validateStep(i: number) {
    const parsed = signupSchema.safeParse(payload());
    if (parsed.success) return true;
    const all = fieldErrorsFrom(parsed.error);
    const mine: Record<string, string> = {};
    for (const f of STEPS[i].fields) if (all[f]) mine[f] = all[f];
    setErrors(mine);
    return Object.keys(mine).length === 0;
  }

  function go(next: number) {
    setDir(next > step ? 1 : -1);
    setStep(next);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function onNext() {
    if (validateStep(step)) go(step + 1);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step < STEPS.length - 1) return onNext();
    if (!validateStep(step)) return;
    startTransition(async () => {
      const result = await submitSignup(payload());
      if (result.ok) {
        setDone(true);
        topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        if (result.fieldErrors) {
          setErrors(result.fieldErrors);
          const firstStep = STEPS.findIndex((st) => st.fields.some((f) => result.fieldErrors?.[f]));
          if (firstStep >= 0 && firstStep !== step) go(firstStep);
        }
        toast.error(result.error);
      }
    });
  }

  const toggleTest = (t: TestName) => {
    const has = s.tests.includes(t);
    set("tests", has ? s.tests.filter((x) => x !== t) : [...s.tests, t]);
    if (t === "AP exam" && has) set("apExams", []);
  };

  const canSubmit = s.consentGuardian && s.consentContact;

  if (done) {
    return (
      <div ref={topRef} className="flex scroll-mt-32 flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <SuccessCheck />
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-4xl text-ink-900">Thank you. We have it from here.</h2>
          <p className="measure text-lg text-ink-600">
            We sent a confirmation to <span className="font-semibold text-ink-900">{s.parentEmail}</span>.
          </p>
        </div>
        <ol className="flex flex-col border-t border-line">
          {[
            ["Within one business day", `We email you to book a free 20-minute consultation about ${s.studentFirstName}.`],
            ["On the call", `We learn about ${s.studentFirstName}'s goals, timeline, and how they like to learn.`],
            ["Then", `We match ${s.studentFirstName} with an Ivy League tutor and set a weekly time.`],
          ].map(([when, what], i) => (
            <li key={when} className="grid grid-cols-[48px_1fr] gap-4 border-b border-line py-6">
              <span className="font-display text-2xl text-ivy-700 tabular">0{i + 1}</span>
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-ink-900">{when}</p>
                <p className="text-ink-600">{what}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link href="/" className="w-fit text-sm font-semibold text-ivy-700 underline decoration-ivy-200 decoration-2 underline-offset-4 hover:decoration-ivy-700">
          Back to the home page
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-8">
      <div ref={topRef} className="scroll-mt-32" />
      <Honeypot value={s.website} onChange={(v) => set("website", v)} />

      {/* Progress */}
      <div className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <p className="eyebrow text-ink-600">
            Step <span className="tabular">{step + 1}</span> of {STEPS.length}
          </p>
          <p className="text-sm font-semibold text-ink-900">{STEPS[step].title}</p>
        </div>
        <div className="grid grid-cols-4 gap-2" aria-hidden>
          {STEPS.map((st, i) => (
            <div key={st.title} className="h-1 overflow-hidden rounded-full bg-line">
              <div
                className="h-full origin-left rounded-full bg-ivy-700 transition-transform duration-300 ease-soft"
                style={{ transform: `scaleX(${i <= step ? 1 : 0})` }}
              />
            </div>
          ))}
        </div>
      </div>

      <div
        key={step}
        className={cn(
          "flex flex-col gap-6 animate-in fade-in duration-300 ease-soft",
          dir === 1 ? "slide-in-from-right-4" : "slide-in-from-left-4",
        )}
      >
        {step === 0 && (
          <>
            <h2 className="font-display text-3xl text-ink-900">First, a little about you.</h2>
            <Field label="Parent or guardian name" htmlFor="parentName" error={errors.parentName}>
              <Input id="parentName" autoComplete="name" value={s.parentName} onChange={(e) => set("parentName", e.target.value)} aria-invalid={!!errors.parentName} />
            </Field>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Phone number" htmlFor="parentPhone" error={errors.parentPhone}>
                <Input id="parentPhone" type="tel" inputMode="tel" autoComplete="tel" value={s.parentPhone} onChange={(e) => set("parentPhone", e.target.value)} aria-invalid={!!errors.parentPhone} />
              </Field>
              <Field label="Email" htmlFor="parentEmail" error={errors.parentEmail}>
                <Input id="parentEmail" type="email" inputMode="email" autoComplete="email" value={s.parentEmail} onChange={(e) => set("parentEmail", e.target.value)} aria-invalid={!!errors.parentEmail} />
              </Field>
            </div>
            <CheckRow checked={s.parentSms} onCheckedChange={(v) => set("parentSms", v)} hint="Optional">
              Text me about all scheduling updates and sessions
            </CheckRow>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="font-display text-3xl text-ink-900">Now, your student.</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Student first name" htmlFor="studentFirstName" error={errors.studentFirstName}>
                <Input id="studentFirstName" autoComplete="off" value={s.studentFirstName} onChange={(e) => set("studentFirstName", e.target.value)} aria-invalid={!!errors.studentFirstName} />
              </Field>
              <Field label="Grade" htmlFor="studentGrade" error={errors.studentGrade}>
                <Select value={s.studentGrade} onValueChange={(v) => set("studentGrade", v)}>
                  <SelectTrigger id="studentGrade" className="w-full" aria-invalid={!!errors.studentGrade}>
                    <SelectValue placeholder="Choose a grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map((g) => (
                      <SelectItem key={g} value={g} className="min-h-11">
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Student phone" htmlFor="studentPhone" optional error={errors.studentPhone}>
                <Input id="studentPhone" type="tel" inputMode="tel" autoComplete="off" value={s.studentPhone} onChange={(e) => set("studentPhone", e.target.value)} aria-invalid={!!errors.studentPhone} />
              </Field>
              <Field label="Student email" htmlFor="studentEmail" optional error={errors.studentEmail}>
                <Input id="studentEmail" type="email" inputMode="email" autoComplete="off" value={s.studentEmail} onChange={(e) => set("studentEmail", e.target.value)} aria-invalid={!!errors.studentEmail} />
              </Field>
            </div>
            <div className="flex flex-col">
              <CheckRow checked={s.studentEmailUpdates} onCheckedChange={(v) => set("studentEmailUpdates", v)} hint="Optional">
                Email student about all upcoming scheduling and sessions
              </CheckRow>
              <CheckRow checked={s.studentTextUpdates} onCheckedChange={(v) => set("studentTextUpdates", v)} hint="Optional">
                Text student about all upcoming scheduling and sessions
              </CheckRow>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-display text-3xl text-ink-900">Which tests is {s.studentFirstName || "your student"} preparing for?</h2>
            <Field label="Choose all that apply" error={errors.tests}>
              <div role="group" aria-label="Tests" className="flex flex-wrap gap-2">
                {TESTS.map((t) => (
                  <ChoiceChip key={t} selected={s.tests.includes(t)} onToggle={() => toggleTest(t)} description={TEST_DESCRIPTIONS[t]}>
                    {t}
                  </ChoiceChip>
                ))}
              </div>
            </Field>

            {s.tests.includes("AP exam") && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <ApPicker value={s.apExams} onChange={(v) => set("apExams", v)} error={errors.apExams} />
              </div>
            )}

            <Field label="Preferred tutor" htmlFor="preferredTutor" optional optionalLabel="not required" hint="If someone recommended a tutor by name, tell us here.">
              <Input id="preferredTutor" autoComplete="off" value={s.preferredTutor} onChange={(e) => set("preferredTutor", e.target.value)} />
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-display text-3xl text-ink-900">Last step.</h2>
            <dl className="grid gap-x-8 gap-y-4 rounded-xl border border-line bg-surface p-6 text-sm sm:grid-cols-2">
              <Summary label="Parent" value={`${s.parentName} · ${s.parentPhone}`} sub={s.parentEmail} onEdit={() => go(0)} />
              <Summary label="Student" value={`${s.studentFirstName} · ${s.studentGrade}`} sub={[s.studentEmail, s.studentPhone].filter(Boolean).join(" · ")} onEdit={() => go(1)} />
              <Summary
                label="Tests"
                value={[...s.tests.filter((t) => t !== "AP exam"), ...s.apExams].join(", ")}
                sub={s.preferredTutor ? `Preferred tutor: ${s.preferredTutor}` : undefined}
                onEdit={() => go(2)}
                wide
              />
            </dl>
            <div className="flex flex-col gap-2">
              <CheckRow checked={s.consentGuardian} onCheckedChange={(v) => set("consentGuardian", v)} invalid={!!errors.consentGuardian}>
                I am this student&apos;s parent or legal guardian, or I am the student and I&apos;m 18 or older.
              </CheckRow>
              <CheckRow checked={s.consentContact} onCheckedChange={(v) => set("consentContact", v)} invalid={!!errors.consentContact}>
                I agree that IvyUp may contact me by email or phone about tutoring.
              </CheckRow>
            </div>
            <p className="measure text-xs text-ink-600">
              By submitting this form, you agree to our{" "}
              <Link href="/privacy" target="_blank" className="font-semibold underline underline-offset-2 hover:text-ink-900">
                Privacy Policy
              </Link>
              . We only ask for your student&apos;s first name and grade, and we use what you share to find a tutor and to contact you about tutoring.
            </p>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-line pt-6">
        {step > 0 ? (
          <Button type="button" variant="ghost" onClick={() => go(step - 1)}>
            <ArrowLeft /> Back
          </Button>
        ) : (
          <span />
        )}
        {step < STEPS.length - 1 ? (
          <Button type="button" size="lg" onClick={onNext} className="group/next">
            Continue <ArrowRight className="transition-transform duration-200 ease-soft group-hover/next:translate-x-0.5" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="lg"
            disabled={!canSubmit || pending}
            aria-disabled={!canSubmit || pending}
            className={cn(!canSubmit && "bg-line text-ink-600 shadow-none")}
          >
            {pending ? "Sending…" : "Request my free consultation"}
          </Button>
        )}
      </div>
      {step === STEPS.length - 1 && !canSubmit && (
        <p className="-mt-4 text-right text-sm text-ink-600">Check both boxes above to submit.</p>
      )}
    </form>
  );
}

function Summary({ label, value, sub, onEdit, wide }: { label: string; value: string; sub?: string; onEdit: () => void; wide?: boolean }) {
  return (
    <div className={cn("flex items-start justify-between gap-4", wide && "sm:col-span-2")}>
      <div className="flex flex-col gap-1">
        <dt className="eyebrow text-ink-600">{label}</dt>
        <dd className="font-semibold text-ink-900">{value}</dd>
        {sub && <dd className="text-ink-600">{sub}</dd>}
      </div>
      <button type="button" onClick={onEdit} className="min-h-11 rounded-md px-2 text-sm font-semibold text-ivy-700 hover:underline">
        Edit
      </button>
    </div>
  );
}

function ApPicker({ value, onChange, error }: { value: ApExam[]; onChange: (v: ApExam[]) => void; error?: string }) {
  const [open, setOpen] = useState(false);
  const remaining = AP_EXAMS.filter((e) => !value.includes(e));
  return (
    <Field label="Which AP exams?" error={error} hint="Add as many as you need.">
      <div className="flex flex-col gap-2">
        {value.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {value.map((exam) => (
              <li key={exam} className="inline-flex min-h-11 items-center gap-1 rounded-md border border-ivy-700 bg-ivy-100 pl-4 text-sm font-semibold text-ivy-900 animate-in fade-in zoom-in-95 duration-200">
                {exam}
                <button
                  type="button"
                  aria-label={`Remove ${exam}`}
                  onClick={() => onChange(value.filter((v) => v !== exam))}
                  className="flex size-11 items-center justify-center rounded-md text-ivy-700 transition-colors hover:text-danger"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="w-full justify-between sm:w-96" aria-invalid={!!error}>
              <span className="flex items-center gap-2 font-medium text-ink-600">
                {value.length > 0 ? <Plus /> : null}
                {value.length > 0 ? "Add another AP exam" : "Search AP exams"}
              </span>
              <ChevronsUpDown className="text-ink-400" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[min(24rem,calc(100vw-2rem))] p-0">
            <Command>
              <CommandInput placeholder="Type to search, e.g. Calculus" />
              <CommandList data-lenis-prevent>
                <CommandEmpty>No AP exam by that name.</CommandEmpty>
                <CommandGroup>
                  {remaining.map((exam) => (
                    <CommandItem
                      key={exam}
                      value={exam}
                      className="min-h-11"
                      onSelect={() => {
                        onChange([...value, exam]);
                        setOpen(false);
                      }}
                    >
                      {exam}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </Field>
  );
}
