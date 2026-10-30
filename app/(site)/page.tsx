import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactForm } from "@/components/site/contact-form";
import { TestimonialQuote } from "@/components/site/testimonial-quote";
import { TutorPortrait } from "@/components/site/tutor-portrait";
import { getPostedTestimonials, getPostedTutors } from "@/lib/public-data";

export const revalidate = 300;

const EXAMS = [
  ["SAT", "Digital SAT, reading, writing and math"],
  ["PSAT", "PSAT/NMSQT and National Merit"],
  ["ACT", "English, math, reading and science"],
  ["SHSAT", "NYC specialized high schools"],
  ["SSAT", "Independent school admissions"],
  ["ISEE", "Independent school admissions"],
  ["AP", "Every College Board AP exam"],
] as const;

const STEPS = [
  {
    title: "Tell us about your student",
    body: "A two-minute form: your contact details, your student's first name and grade, and the tests ahead.",
  },
  {
    title: "Talk with us, free",
    body: "Within one business day we email you to book a 20-minute consultation over Zoom. We listen first.",
  },
  {
    title: "Meet your Ivy League tutor",
    body: "We match your student with a tutor who fits, set a weekly time, and keep you updated by email or text.",
  },
] as const;

const STANDARDS = [
  ["Ivy League, verified", "Every tutor is a current student at an Ivy League university. We confirm enrollment before anyone teaches."],
  ["Interviewed and vetted", "Tutors are selected through a written application and a live interview. A background check may be required."],
  ["Every session recorded", "Sessions happen over video and are recorded, so you can review progress and nothing is ever unclear."],
  ["You're always informed", "Homework and session notes are tracked for each student, and you choose how we keep you updated."],
] as const;

export default async function HomePage() {
  const [tutors, testimonials] = await Promise.all([getPostedTutors(), getPostedTestimonials()]);
  const [featured, ...moreTestimonials] = testimonials;

  return (
    <>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl gap-16 px-4 pt-12 pb-24 sm:px-8 sm:pt-24 lg:grid-cols-[1.25fr_1fr] lg:items-end lg:gap-24 lg:pb-32">
        <div className="flex flex-col gap-8">
          <p className="eyebrow text-brass-700">Tutoring by Ivy League students</p>
          <h1 data-split className="font-display text-5xl text-ink-900 sm:text-6xl">
            Learn from students who just aced the test.
          </h1>
          <p className="measure text-lg text-ink-600 sm:text-xl">
            One-on-one SAT, ACT, AP and admissions-test tutoring with current students at Ivy League universities. It starts with a free consultation.
          </p>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-8">
            <Button asChild size="lg" className="group/cta h-14 px-8 text-lg">
              <Link href="/get-started">
                Find a tutor
                <ArrowRight className="size-5 transition-transform duration-200 ease-soft group-hover/cta:translate-x-1" />
              </Link>
            </Button>
            <Link href="#how-it-works" className="py-2 text-base font-semibold text-ink-600 transition-colors hover:text-ink-900">
              See how it works
            </Link>
          </div>
        </div>

        <div data-reveal className="flex flex-col">
          <p className="eyebrow border-b border-ink-900 pb-4 text-ink-900">Tests we prepare students for</p>
          <ul data-reveal="stagger">
            {EXAMS.map(([name, desc]) => (
              <li key={name} className="flex items-baseline justify-between gap-4 border-b border-line py-4">
                <span className="font-display text-2xl text-ink-900">{name}</span>
                <span className="text-right text-sm text-ink-600">{desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-24 border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-24 sm:px-8 lg:py-32">
          <div data-reveal className="flex max-w-2xl flex-col gap-4">
            <p className="eyebrow text-brass-700">How it works</p>
            <h2 className="font-display text-4xl text-ink-900 sm:text-5xl">Three steps, and you always know the next one.</h2>
          </div>
          <ol data-reveal="stagger" className="grid gap-12 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex flex-col gap-4 border-t-2 border-ink-900 pt-6">
                <span className="font-display text-5xl text-ivy-700 tabular">0{i + 1}</span>
                <h3 className="font-display text-2xl text-ink-900">{step.title}</h3>
                <p className="text-base text-ink-600">{step.body}</p>
              </li>
            ))}
          </ol>
          <div data-reveal>
            <Button asChild size="lg">
              <Link href="/get-started">Start with step one</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Standard */}
      <section className="bg-ivy-900 text-paper">
        <div className="mx-auto grid max-w-6xl gap-16 px-4 py-24 sm:px-8 lg:grid-cols-[1fr_1.5fr] lg:py-32">
          <div data-reveal className="flex flex-col gap-4">
            <p className="eyebrow text-brass-500">The IvyUp standard</p>
            <h2 className="font-display text-4xl sm:text-5xl">Trust is earned before the first session.</h2>
          </div>
          <dl data-reveal="stagger" className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
            {STANDARDS.map(([title, body]) => (
              <div key={title} className="flex flex-col gap-2 border-t border-ivy-800 pt-6">
                <dt className="font-display text-xl text-paper">{title}</dt>
                <dd className="text-base text-ivy-200">{body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Tutors */}
      {tutors.length > 0 && (
        <section id="tutors" className="mx-auto flex max-w-6xl scroll-mt-24 flex-col gap-16 px-4 py-24 sm:px-8 lg:py-32">
          <div data-reveal className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
            <div className="flex max-w-2xl flex-col gap-4">
              <p className="eyebrow text-brass-700">Meet the tutors</p>
              <h2 className="font-display text-4xl text-ink-900 sm:text-5xl">They were in your student&apos;s seat not long ago.</h2>
            </div>
            {tutors.length > 3 && (
              <Link href="/tutors" className="shrink-0 py-2 text-base font-semibold text-ivy-700 underline decoration-ivy-200 decoration-2 underline-offset-4 hover:decoration-ivy-700">
                All {tutors.length} tutors
              </Link>
            )}
          </div>
          <div data-reveal="stagger" className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
            {tutors.slice(0, 3).map((t) => (
              <TutorPortrait key={t.id} {...t} />
            ))}
          </div>
        </section>
      )}

      {/* Testimonials */}
      {featured && (
        <section id="results" className="scroll-mt-24 border-t border-line bg-surface">
          <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-24 sm:px-8 lg:py-32">
            <p data-reveal className="eyebrow text-brass-700">Results from IvyUp families</p>
            <div data-reveal>
              <TestimonialQuote featured {...featured} />
            </div>
            {moreTestimonials.length > 0 && (
              <div data-reveal="stagger" className="grid gap-x-16 gap-y-8 md:grid-cols-2">
                {moreTestimonials.slice(0, 4).map((t) => (
                  <TestimonialQuote key={t.id} {...t} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Closing call to action */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-8 lg:py-32">
        <div data-reveal className="flex flex-col items-start gap-8 border-y-2 border-ink-900 py-16">
          <h2 className="max-w-3xl font-display text-4xl text-ink-900 sm:text-5xl">
            The first conversation is free, and it&apos;s with a person.
          </h2>
          <Button asChild size="lg" className="h-14 px-8 text-lg">
            <Link href="/get-started">Find a tutor</Link>
          </Button>
          <p className="text-base text-ink-600">
            Studying at an Ivy League university?{" "}
            <Link href="/apply" className="font-semibold text-ivy-700 underline decoration-ivy-200 decoration-2 underline-offset-4 hover:decoration-ivy-700">
              Apply to tutor
            </Link>
          </p>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-24 border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-8 lg:grid-cols-[1fr_1.4fr] lg:gap-24">
          <div data-reveal className="flex flex-col gap-4">
            <p className="eyebrow text-brass-700">Questions first?</p>
            <h2 className="font-display text-4xl text-ink-900">Write to us.</h2>
            <p className="measure text-ink-600">
              We answer every message within one business day. You can also email{" "}
              <a href="mailto:hello@ivyup.org" className="font-semibold text-ink-900 underline underline-offset-4">
                hello@ivyup.org
              </a>
              .
            </p>
          </div>
          <div data-reveal>
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
