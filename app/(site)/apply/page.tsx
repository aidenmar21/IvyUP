import type { Metadata } from "next";
import { ApplicationForm } from "@/components/site/application-form";

export const metadata: Metadata = {
  title: "Apply to tutor",
  description: "Current Ivy League students: apply to tutor SAT, ACT, AP and admissions tests with IvyUp.",
};

export default function ApplyPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 pt-12 pb-24 sm:px-8 sm:pt-24">
      <header className="flex max-w-3xl flex-col gap-4">
        <p className="eyebrow text-brass-700">IvyUp tutor application</p>
        <h1 data-split className="font-display text-5xl text-ink-900 sm:text-6xl">
          Teach what you recently mastered.
        </h1>
        <p className="measure text-lg text-ink-600">
          Thanks for your interest! This takes about 10 minutes. We use your answers to match you with families, so the subject and availability sections matter most. Your answers save on this device as you go.
        </p>
      </header>
      <ApplicationForm />
    </div>
  );
}
