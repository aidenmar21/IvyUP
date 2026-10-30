import type { Testimonial } from "@/lib/types";

export function photoUrl(path: string | null | undefined) {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/tutor-photos/${path}`;
}

/** Headline for a testimonial, e.g. "SAT 1290 → 1480" or "5 on AP Calculus BC". */
export function testimonialHeadline(t: Pick<Testimonial, "result_type" | "score_from" | "score_to" | "ap_exam" | "ap_score" | "result_text">) {
  if (t.result_type === "ap") {
    if (t.ap_score && t.ap_exam) return `${t.ap_score} on ${t.ap_exam}`;
    return t.result_text ?? "";
  }
  if (t.result_type === "other") return t.result_text ?? "";
  const label = t.result_type.toUpperCase();
  if (t.score_from != null && t.score_to != null) return `${label} ${t.score_from} → ${t.score_to}`;
  if (t.score_to != null) return `${label} ${t.score_to}`;
  return t.result_text ?? label;
}

export function testimonialGain(t: Pick<Testimonial, "result_type" | "score_from" | "score_to">) {
  if (t.result_type === "ap" || t.result_type === "other") return null;
  if (t.score_from == null || t.score_to == null) return null;
  const diff = t.score_to - t.score_from;
  return diff > 0 ? `+${diff}` : null;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function digitsOnly(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

export function smsHref(phone: string, body?: string) {
  const digits = digitsOnly(phone);
  const to = /^\d{10}$/.test(digits) ? `+1${digits}` : digits;
  return body ? `sms:${to}?&body=${encodeURIComponent(body)}` : `sms:${to}`;
}

export function subjectsLabel(subjects: string[], apExams: string[]) {
  const list = subjects.filter((s) => s !== "AP exam");
  return [...list, ...apExams].join(", ");
}
