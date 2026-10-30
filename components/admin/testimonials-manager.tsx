"use client";

import { useRef, useState, useTransition } from "react";
import { MessageSquareQuote, Plus, ScanText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Field } from "@/components/shared/form-bits";
import { Chip, EmptyState, PageHeader } from "@/components/admin/ui";
import { SortableList } from "@/components/admin/sortable-list";
import { TestimonialQuote } from "@/components/site/testimonial-quote";
import { deleteTestimonial, reorder, saveTestimonial, setTestimonialStatus } from "@/app/admin/actions";
import { AP_EXAMS } from "@/lib/constants";
import { testimonialHeadline } from "@/lib/format";
import type { Testimonial, Tutor } from "@/lib/types";
import { cn } from "@/lib/utils";

type ResultType = Testimonial["result_type"];
type Draft = {
  id?: string;
  resultType: ResultType;
  scoreFrom: string;
  scoreTo: string;
  apExam: string;
  apScore: string;
  resultText: string;
  quote: string;
  attributionName: string;
  attributionRole: "parent" | "student";
  tutorName: string;
};

const EMPTY: Draft = { resultType: "sat", scoreFrom: "", scoreTo: "", apExam: "", apScore: "", resultText: "", quote: "", attributionName: "", attributionRole: "parent", tutorName: "" };

function toDraft(t: Testimonial): Draft {
  return {
    id: t.id,
    resultType: t.result_type,
    scoreFrom: t.score_from?.toString() ?? "",
    scoreTo: t.score_to?.toString() ?? "",
    apExam: t.ap_exam ?? "",
    apScore: t.ap_score?.toString() ?? "",
    resultText: t.result_text ?? "",
    quote: t.quote,
    attributionName: t.attribution_name,
    attributionRole: t.attribution_role,
    tutorName: t.tutor_name ?? "",
  };
}

const RESULT_TYPES: { v: ResultType; l: string }[] = [
  { v: "sat", l: "SAT score" },
  { v: "act", l: "ACT score" },
  { v: "psat", l: "PSAT score" },
  { v: "ap", l: "AP exam" },
  { v: "other", l: "Other result" },
];

export function TestimonialsManager({ testimonials, tutors }: { testimonials: Testimonial[]; tutors: Tutor[] }) {
  const [editing, setEditing] = useState<Draft | null>(null);
  const posted = testimonials.filter((t) => t.status === "posted").length;
  return (
    <>
      <PageHeader
        title="Testimonials"
        description={`Results families share, shown on the home page. ${posted} posted, ${testimonials.length - posted} in draft.`}
        action={
          <Button onClick={() => setEditing({ ...EMPTY })}>
            <Plus /> New testimonial
          </Button>
        }
      />
      <div className="px-4 pb-8 sm:px-8">
        {testimonials.length === 0 ? (
          <EmptyState
            icon={MessageSquareQuote}
            title="No testimonials yet"
            body="Write one in, or import a screenshot of a parent's text or email and we'll read the words out of it for you."
          />
        ) : (
          <>
            <p className="pb-4 text-sm text-ink-600">The first posted testimonial is featured. Drag, or use the arrows, to reorder.</p>
            <SortableList
              items={testimonials}
              onReorder={async (ids) => {
                const r = await reorder("testimonials", ids);
                if (!r.ok) toast.error(r.error);
              }}
              render={(t) => <Row t={t} onEdit={() => setEditing(toDraft(t))} />}
            />
          </>
        )}
      </div>
      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="right" className="overflow-y-auto data-[side=right]:sm:max-w-5xl" data-lenis-prevent>
          {editing && <Editor key={editing.id ?? "new"} initial={editing} tutors={tutors} onClose={() => setEditing(null)} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Row({ t, onEdit }: { t: Testimonial; onEdit: () => void }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-4 p-4">
      <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 flex-col text-left">
        <span className="truncate font-semibold text-ivy-700 tabular">{testimonialHeadline(t) || "No result"}</span>
        <span className="truncate text-sm text-ink-600">
          “{t.quote}” · {t.attribution_name}
        </span>
      </button>
      <Chip tone={t.status === "posted" ? "ivy" : "neutral"}>{t.status === "posted" ? "Posted" : "Draft"}</Chip>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        className="hidden sm:inline-flex"
        onClick={() =>
          start(async () => {
            const next = t.status === "posted" ? "draft" : "posted";
            const r = await setTestimonialStatus(t.id, next);
            if (!r.ok) return void toast.error(r.error);
            toast.success(next === "posted" ? "Posted to the site" : "Hidden from the site", { action: { label: "Undo", onClick: () => setTestimonialStatus(t.id, t.status) } });
          })
        }
      >
        {t.status === "posted" ? "Unpost" : "Post"}
      </Button>
      <Button variant="outline" size="sm" onClick={onEdit}>
        Edit
      </Button>
    </div>
  );
}

function Editor({ initial, tutors, onClose }: { initial: Draft; tutors: Tutor[]; onClose: () => void }) {
  const [v, setV] = useState<Draft>(initial);
  const [pending, start] = useTransition();
  const [ocr, setOcr] = useState<{ progress: number; status: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Draft>(k: K, x: Draft[K]) => setV((p) => ({ ...p, [k]: x }));

  async function runOcr(file: File) {
    setOcr({ progress: 0, status: "Loading text reader" });
    try {
      // Loaded on demand: runs entirely in this browser, no API key or upload.
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: (m) => setOcr({ progress: Math.round((m.progress ?? 0) * 100), status: m.status === "recognizing text" ? "Reading the image" : "Loading text reader" }),
      });
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const text = data.text
        .replace(/[ \t]+/g, " ")
        .replace(/\n{2,}/g, "\n\n")
        .replace(/([^\n])\n(?!\n)/g, "$1 ")
        .trim();
      if (!text) {
        toast.error("No readable text found in that image.");
      } else {
        setV((p) => ({ ...p, quote: p.quote ? `${p.quote}\n\n${text}` : text }));
        toast.success("Text imported. Review it before posting.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Couldn't read that image. Try a clearer screenshot.");
    } finally {
      setOcr(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function save(status: "draft" | "posted") {
    start(async () => {
      const r = await saveTestimonial({ ...v, status });
      if (!r.ok) return void toast.error(r.error);
      toast.success(status === "posted" ? "Testimonial is live" : "Draft saved");
      onClose();
    });
  }

  const preview = {
    result_type: v.resultType,
    score_from: v.scoreFrom ? Number(v.scoreFrom) : null,
    score_to: v.scoreTo ? Number(v.scoreTo) : null,
    ap_exam: v.apExam || null,
    ap_score: v.apScore ? Number(v.apScore) : null,
    result_text: v.resultText || null,
    quote: v.quote,
    attribution_name: v.attributionName,
    attribution_role: v.attributionRole,
    tutor_name: v.tutorName || null,
  };
  const isScore = v.resultType === "sat" || v.resultType === "act" || v.resultType === "psat";

  return (
    <>
      <SheetHeader>
        <SheetTitle>{initial.id ? "Edit testimonial" : "New testimonial"}</SheetTitle>
        <SheetDescription>The result goes on top, then the quote, then who said it and their tutor.</SheetDescription>
      </SheetHeader>
      <div className="grid gap-8 px-6 pb-8 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-4">
            <h3 className="eyebrow text-ink-600">Result</h3>
            <div role="radiogroup" aria-label="Result type" className="flex flex-wrap gap-2">
              {RESULT_TYPES.map((r) => (
                <button
                  key={r.v}
                  type="button"
                  role="radio"
                  aria-checked={v.resultType === r.v}
                  onClick={() => set("resultType", r.v)}
                  className={cn(
                    "min-h-11 rounded-md border px-4 text-sm font-semibold transition-[background-color,border-color] duration-200",
                    v.resultType === r.v ? "border-ivy-700 bg-ivy-100 text-ivy-900" : "border-line bg-surface text-ink-900 hover:border-ink-400",
                  )}
                >
                  {r.l}
                </button>
              ))}
            </div>
            {isScore && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200">
                <Field label="Score before" htmlFor="t-from" optional>
                  <Input id="t-from" inputMode="numeric" className="tabular" value={v.scoreFrom} onChange={(e) => set("scoreFrom", e.target.value.replace(/\D/g, ""))} />
                </Field>
                <Field label="Score after" htmlFor="t-to">
                  <Input id="t-to" inputMode="numeric" className="tabular" value={v.scoreTo} onChange={(e) => set("scoreTo", e.target.value.replace(/\D/g, ""))} />
                </Field>
              </div>
            )}
            {v.resultType === "ap" && (
              <div className="grid gap-4 sm:grid-cols-[1fr_120px] animate-in fade-in duration-200">
                <Field label="AP exam" htmlFor="t-ap">
                  <Select value={v.apExam} onValueChange={(x) => set("apExam", x)}>
                    <SelectTrigger id="t-ap" className="w-full">
                      <SelectValue placeholder="Choose an exam" />
                    </SelectTrigger>
                    <SelectContent>
                      {AP_EXAMS.map((x) => (
                        <SelectItem key={x} value={x} className="min-h-11">
                          {x}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Score" htmlFor="t-apscore">
                  <Select value={v.apScore} onValueChange={(x) => set("apScore", x)}>
                    <SelectTrigger id="t-apscore" className="w-full">
                      <SelectValue placeholder="1–5" />
                    </SelectTrigger>
                    <SelectContent>
                      {["5", "4", "3", "2", "1"].map((x) => (
                        <SelectItem key={x} value={x} className="min-h-11">
                          {x}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            )}
            {v.resultType === "other" && (
              <Field label="Result" htmlFor="t-other" hint="e.g. Admitted to Stuyvesant, or A in AP Chemistry">
                <Input id="t-other" value={v.resultText} onChange={(e) => set("resultText", e.target.value)} />
              </Field>
            )}
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="eyebrow text-ink-600">Testimonial</h3>
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && runOcr(e.target.files[0])} />
              <Button type="button" variant="outline" size="sm" disabled={!!ocr} onClick={() => fileRef.current?.click()}>
                <ScanText /> Import from a screenshot
              </Button>
            </div>
            {ocr && (
              <div className="flex flex-col gap-2 rounded-md bg-paper-2 p-4 animate-in fade-in duration-200" aria-live="polite">
                <p className="text-sm text-ink-900">{ocr.status}…</p>
                <div className="h-1 overflow-hidden rounded-full bg-line">
                  <div className="h-full origin-left bg-ivy-700 transition-transform duration-300 ease-soft" style={{ transform: `scaleX(${ocr.progress / 100})` }} />
                </div>
              </div>
            )}
            <Field label="What they said" htmlFor="t-quote" hint="Edit freely. Imported text is never posted until you save and post.">
              <Textarea id="t-quote" rows={6} value={v.quote} onChange={(e) => set("quote", e.target.value)} />
            </Field>
          </section>

          <section className="flex flex-col gap-4">
            <h3 className="eyebrow text-ink-600">Attribution</h3>
            <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
              <Field label="Name of student or parent" htmlFor="t-name" hint="First name and last initial is common, e.g. Sarah K.">
                <Input id="t-name" value={v.attributionName} onChange={(e) => set("attributionName", e.target.value)} />
              </Field>
              <Field label="They are the" htmlFor="t-role">
                <Select value={v.attributionRole} onValueChange={(x) => set("attributionRole", x as Draft["attributionRole"])}>
                  <SelectTrigger id="t-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent" className="min-h-11">Parent</SelectItem>
                    <SelectItem value="student" className="min-h-11">Student</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Tutor" htmlFor="t-tutor" optional>
              <Input id="t-tutor" list="tutor-names" value={v.tutorName} onChange={(e) => set("tutorName", e.target.value)} />
              <datalist id="tutor-names">
                {tutors.map((t) => (
                  <option key={t.id} value={t.preferred_name ? `${t.preferred_name} ${t.full_name.split(" ").slice(-1)[0]}` : t.full_name} />
                ))}
              </datalist>
            </Field>
          </section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <p className="eyebrow text-ink-600">Preview</p>
          <div className="rounded-xl border border-line bg-surface p-6">
            <TestimonialQuote featured {...preview} />
          </div>
        </aside>
      </div>
      <div className="sticky bottom-0 mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line bg-popover px-6 py-4 safe-bottom">
        {initial.id ? (
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                if (!window.confirm("Delete this testimonial?")) return;
                const r = await deleteTestimonial(initial.id!);
                if (!r.ok) return void toast.error(r.error);
                toast("Testimonial deleted");
                onClose();
              })
            }
          >
            <Trash2 /> Delete
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="outline" disabled={pending} onClick={() => save("draft")}>
            Save draft
          </Button>
          <Button disabled={pending || !v.quote || !v.attributionName} onClick={() => save("posted")}>
            {pending ? "Saving…" : "Save and post"}
          </Button>
        </div>
      </div>
    </>
  );
}
