import { testimonialGain, testimonialHeadline } from "@/lib/format";
import type { Testimonial } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = Pick<
  Testimonial,
  "result_type" | "score_from" | "score_to" | "ap_exam" | "ap_score" | "result_text" | "quote" | "attribution_name" | "attribution_role" | "tutor_name"
> & { featured?: boolean };

export function TestimonialQuote({ featured, ...t }: Props) {
  const headline = testimonialHeadline(t);
  const gain = testimonialGain(t);
  return (
    <figure className={cn("flex flex-col gap-6", featured ? "gap-8" : "border-t border-line pt-8")}>
      {headline && (
        <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className={cn("font-display tabular text-ivy-700", featured ? "text-4xl sm:text-5xl" : "text-2xl")}>{headline}</span>
          {gain && (
            <span className="rounded-sm bg-brass-100 px-2 py-1 text-sm font-semibold tabular text-brass-700">{gain} points</span>
          )}
        </p>
      )}
      <blockquote className={cn("measure font-display text-ink-900", featured ? "text-2xl sm:text-3xl" : "text-xl")}>
        <p>“{t.quote || "The testimonial text appears here."}”</p>
      </blockquote>
      <figcaption className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-ink-900">
          {t.attribution_name || "Name"}
          <span className="font-normal text-ink-600">, {t.attribution_role === "student" ? "student" : "parent"}</span>
        </span>
        {t.tutor_name && <span className="text-ink-600">Tutored by {t.tutor_name}</span>}
      </figcaption>
    </figure>
  );
}
