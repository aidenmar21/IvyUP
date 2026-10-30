"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckRow, ChoiceChip, Field } from "@/components/shared/form-bits";
import { TutorSelect } from "@/components/admin/dialogs";
import type { StudentFormInput } from "@/app/admin/actions";
import { AP_EXAMS, GRADES, TESTS } from "@/lib/constants";
import type { StudentWithFamily, Tutor } from "@/lib/types";

type ApExam = (typeof AP_EXAMS)[number];
type Test = (typeof TESTS)[number];

export function studentToForm(s?: StudentWithFamily): StudentFormInput {
  return {
    parentName: s?.family?.parent_name ?? "",
    parentEmail: s?.family?.parent_email ?? "",
    parentPhone: s?.family?.parent_phone ?? "",
    parentSms: s?.family?.parent_sms_opt_in ?? false,
    firstName: s?.first_name ?? "",
    grade: (s?.grade ?? "") as StudentFormInput["grade"],
    phone: s?.phone ?? "",
    email: s?.email ?? "",
    emailUpdates: s?.email_updates ?? false,
    textUpdates: s?.text_updates ?? false,
    subjects: (s?.subjects ?? []) as Test[],
    apExams: (s?.ap_exams ?? []) as ApExam[],
    preferredTutor: s?.preferred_tutor ?? "",
    notes: s?.owner_notes ?? "",
    stage: "new",
    tutorId: "",
  };
}

export function StudentForm({
  initial,
  tutors,
  showStage,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: StudentFormInput;
  tutors: Tutor[];
  showStage?: boolean;
  submitLabel: string;
  onSubmit: (v: StudentFormInput) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [v, setV] = useState<StudentFormInput>(initial);
  const [pending, start] = useTransition();
  const set = <K extends keyof StudentFormInput>(k: K, val: StudentFormInput[K]) => setV((p) => ({ ...p, [k]: val }));
  const subjects = (v.subjects ?? []) as Test[];
  const apExams = (v.apExams ?? []) as ApExam[];

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (!v.grade) return toast.error("Choose a grade.");
        start(async () => {
          await onSubmit(v);
        });
      }}
    >
      <fieldset className="flex flex-col gap-4">
        <legend className="eyebrow pb-2 text-ink-600">Parent</legend>
        <Field label="Name" htmlFor="sf-parent">
          <Input id="sf-parent" value={v.parentName} onChange={(e) => set("parentName", e.target.value)} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" htmlFor="sf-pphone">
            <Input id="sf-pphone" type="tel" value={v.parentPhone} onChange={(e) => set("parentPhone", e.target.value)} required />
          </Field>
          <Field label="Email" htmlFor="sf-pemail">
            <Input id="sf-pemail" type="email" value={v.parentEmail} onChange={(e) => set("parentEmail", e.target.value)} required />
          </Field>
        </div>
        <CheckRow checked={!!v.parentSms} onCheckedChange={(x) => set("parentSms", x)}>
          Parent wants texts about scheduling and sessions
        </CheckRow>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="eyebrow pb-2 text-ink-600">Student</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="sf-first">
            <Input id="sf-first" value={v.firstName} onChange={(e) => set("firstName", e.target.value)} required />
          </Field>
          <Field label="Grade" htmlFor="sf-grade">
            <Select value={v.grade} onValueChange={(x) => set("grade", x as StudentFormInput["grade"])}>
              <SelectTrigger id="sf-grade" className="w-full">
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
          <Field label="Phone" htmlFor="sf-sphone" optional>
            <Input id="sf-sphone" type="tel" value={v.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Email" htmlFor="sf-semail" optional>
            <Input id="sf-semail" type="email" value={v.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-col">
          <CheckRow checked={!!v.emailUpdates} onCheckedChange={(x) => set("emailUpdates", x)}>
            Email student about sessions
          </CheckRow>
          <CheckRow checked={!!v.textUpdates} onCheckedChange={(x) => set("textUpdates", x)}>
            Text student about sessions
          </CheckRow>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="eyebrow pb-2 text-ink-600">Tutoring</legend>
        <div className="flex flex-wrap gap-2">
          {TESTS.map((t) => (
            <ChoiceChip
              key={t}
              selected={subjects.includes(t)}
              onToggle={() => set("subjects", subjects.includes(t) ? subjects.filter((x) => x !== t) : [...subjects, t])}
            >
              {t}
            </ChoiceChip>
          ))}
        </div>
        {subjects.includes("AP exam") && (
          <Field label="AP exams">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                {apExams.map((x) => (
                  <span key={x} className="inline-flex min-h-9 items-center gap-1 rounded-md bg-ivy-100 pl-3 text-sm font-semibold text-ivy-900">
                    {x}
                    <button type="button" aria-label={`Remove ${x}`} onClick={() => set("apExams", apExams.filter((y) => y !== x))} className="flex size-9 items-center justify-center">
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
              </div>
              <Select value="" onValueChange={(x) => set("apExams", [...apExams, x as ApExam])}>
                <SelectTrigger className="w-full sm:w-80">
                  <SelectValue placeholder="Add an AP exam" />
                </SelectTrigger>
                <SelectContent>
                  {AP_EXAMS.filter((x) => !apExams.includes(x)).map((x) => (
                    <SelectItem key={x} value={x} className="min-h-11">
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Field>
        )}
        <Field label="Preferred tutor" htmlFor="sf-pref" optional optionalLabel="not required">
          <Input id="sf-pref" value={v.preferredTutor ?? ""} onChange={(e) => set("preferredTutor", e.target.value)} />
        </Field>
        <Field label="Private notes" htmlFor="sf-notes" optional hint="Only you can see these.">
          <Textarea id="sf-notes" rows={3} value={v.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </fieldset>

      {showStage && (
        <fieldset className="flex flex-col gap-4">
          <legend className="eyebrow pb-2 text-ink-600">Add to</legend>
          <Select value={v.stage} onValueChange={(x) => set("stage", x as StudentFormInput["stage"])}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new" className="min-h-11">Form responses</SelectItem>
              <SelectItem value="prospect" className="min-h-11">Potential prospects</SelectItem>
              <SelectItem value="active" className="min-h-11">Current students</SelectItem>
            </SelectContent>
          </Select>
          {v.stage === "active" && (
            <Field label="Tutor" htmlFor="sf-tutor">
              <TutorSelect id="sf-tutor" tutors={tutors} value={v.tutorId ?? ""} onChange={(x) => set("tutorId", x)} />
            </Field>
          )}
        </fieldset>
      )}

      <div className="sticky bottom-0 -mx-6 flex justify-end gap-2 border-t border-line bg-popover px-6 py-4">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
