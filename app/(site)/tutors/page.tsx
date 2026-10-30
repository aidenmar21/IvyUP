import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TutorPortrait } from "@/components/site/tutor-portrait";
import { getPostedTutors } from "@/lib/public-data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Meet the tutors",
  description: "Every IvyUp tutor is a current student at an Ivy League university.",
};

export default async function TutorsPage() {
  const tutors = await getPostedTutors();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 pt-12 pb-24 sm:px-8 sm:pt-24">
      <header className="flex max-w-3xl flex-col gap-4">
        <p className="eyebrow text-brass-700">Meet the tutors</p>
        <h1 data-split className="font-display text-5xl text-ink-900 sm:text-6xl">
          Current Ivy League students, chosen one at a time.
        </h1>
        <p className="measure text-lg text-ink-600">
          Each tutor applied in writing, interviewed with us, and teaches the tests they recently mastered themselves.
        </p>
      </header>
      {tutors.length > 0 ? (
        <div data-reveal="stagger" className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {tutors.map((t) => (
            <TutorPortrait key={t.id} {...t} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-4 border-y border-line py-16">
          <h2 className="font-display text-3xl text-ink-900">Tutor profiles are on their way.</h2>
          <p className="measure text-ink-600">
            We&apos;re adding our team&apos;s profiles now. In the meantime, tell us about your student and we&apos;ll introduce you to the right tutor on your consultation call.
          </p>
        </div>
      )}
      <div className="flex flex-col items-start gap-4 border-t-2 border-ink-900 pt-12">
        <h2 className="font-display text-3xl text-ink-900">We&apos;ll suggest the right tutor for your student.</h2>
        <Button asChild size="lg">
          <Link href="/get-started">Find a tutor</Link>
        </Button>
      </div>
    </div>
  );
}
