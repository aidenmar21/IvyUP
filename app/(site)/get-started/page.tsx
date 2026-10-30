import type { Metadata } from "next";
import { SignupForm } from "@/components/site/signup-form";

export const metadata: Metadata = {
  title: "Find a tutor",
  description: "Tell us about your student. We'll email you within one business day to book a free consultation.",
};

export default function GetStartedPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-8 pb-24 sm:px-8 sm:pt-16 lg:grid-cols-[1fr_1.4fr] lg:gap-24">
      <aside className="flex flex-col gap-8 lg:sticky lg:top-32 lg:self-start">
        <div className="flex flex-col gap-4">
          <p className="eyebrow text-brass-700">Find a tutor</p>
          <h1 data-split className="font-display text-4xl text-ink-900 sm:text-5xl">
            Two minutes now. A free consultation next.
          </h1>
          <p className="measure text-lg text-ink-600">
            Tell us about your student and the tests ahead. There&apos;s no cost or commitment to talk with us.
          </p>
        </div>
        <ul className="hidden flex-col gap-4 border-t border-line pt-8 text-sm text-ink-600 lg:flex">
          <li><span className="font-semibold text-ink-900">Only what we need.</span> Your student&apos;s first name and grade, plus how to reach you.</li>
          <li><span className="font-semibold text-ink-900">Never sold or shared.</span> Only your matched tutor sees your student&apos;s details.</li>
          <li><span className="font-semibold text-ink-900">A real reply.</span> A person from IvyUp emails you within one business day.</li>
        </ul>
      </aside>
      <section aria-label="Sign-up form" className="rounded-xl border border-line bg-surface p-6 shadow-lift sm:p-8">
        <SignupForm />
      </section>
    </div>
  );
}
