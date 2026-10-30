import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/site/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions about IvyUp tutoring? Write to us and we'll reply within one business day.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-12 pb-24 sm:px-8 sm:pt-24 lg:grid-cols-[1fr_1.4fr] lg:gap-24">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <p className="eyebrow text-brass-700">Contact</p>
          <h1 data-split className="font-display text-5xl text-ink-900">We&apos;re glad to help.</h1>
          <p className="measure text-lg text-ink-600">Every message is read by a person at IvyUp, and we reply within one business day.</p>
        </div>
        <dl className="flex flex-col gap-6 border-t border-line pt-8">
          <div className="flex flex-col gap-1">
            <dt className="eyebrow text-ink-600">Email</dt>
            <dd>
              <a href="mailto:hello@ivyup.org" className="font-display text-2xl text-ivy-700 underline decoration-ivy-200 decoration-2 underline-offset-4 hover:decoration-ivy-700">
                hello@ivyup.org
              </a>
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="eyebrow text-ink-600">Ready to start?</dt>
            <dd className="text-ink-600">
              The fastest route is the{" "}
              <Link href="/get-started" className="font-semibold text-ink-900 underline underline-offset-4">
                two-minute sign-up form
              </Link>
              .
            </dd>
          </div>
        </dl>
      </div>
      <section aria-label="Contact form" className="rounded-xl border border-line bg-surface p-6 shadow-lift sm:p-8">
        <ContactForm />
      </section>
    </div>
  );
}
