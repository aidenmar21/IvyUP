"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, Honeypot, SuccessCheck, useIdempotencyKey } from "@/components/shared/form-bits";
import { CONTACT_TOPICS, contactSchema } from "@/lib/validation/contact";
import { fieldErrorsFrom } from "@/lib/validation/shared";
import { submitContact } from "@/app/(site)/actions";
import { cn } from "@/lib/utils";

export function ContactForm() {
  const [v, setV] = useState({ name: "", email: "", phone: "", topic: CONTACT_TOPICS[0] as string, message: "", website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const { key, renew } = useIdempotencyKey();

  const set = (k: keyof typeof v, value: string) => {
    setV((p) => ({ ...p, [k]: value }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...v, phone: v.phone || undefined, idempotencyKey: key };
    const parsed = contactSchema.safeParse(payload);
    if (!parsed.success) return setErrors(fieldErrorsFrom(parsed.error));
    start(async () => {
      const r = await submitContact(payload);
      if (r.ok) setSent(true);
      else {
        if (r.fieldErrors) setErrors(r.fieldErrors);
        toast.error(r.error);
      }
    });
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <SuccessCheck />
        <h3 className="font-display text-3xl text-ink-900">Message received.</h3>
        <p className="text-ink-600">We&apos;ll reply to {v.email} within one business day.</p>
        <button
          type="button"
          className="w-fit py-2 text-sm font-semibold text-ivy-700 hover:underline"
          onClick={() => {
            setSent(false);
            renew();
            setV((p) => ({ ...p, message: "" }));
          }}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-6">
      <Honeypot value={v.website} onChange={(x) => set("website", x)} />
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Name" htmlFor="c-name" error={errors.name}>
          <Input id="c-name" autoComplete="name" value={v.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} />
        </Field>
        <Field label="Email" htmlFor="c-email" error={errors.email}>
          <Input id="c-email" type="email" autoComplete="email" value={v.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email} />
        </Field>
      </div>
      <Field label="Phone" htmlFor="c-phone" optional error={errors.phone}>
        <Input id="c-phone" type="tel" autoComplete="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={!!errors.phone} />
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 text-sm font-semibold text-ink-900">What&apos;s this about?</legend>
        <div className="flex flex-wrap gap-2">
          {CONTACT_TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={v.topic === t}
              onClick={() => set("topic", t)}
              className={cn(
                "min-h-11 rounded-md border px-4 text-sm font-semibold transition-[background-color,border-color] duration-200 ease-soft",
                v.topic === t ? "border-ivy-700 bg-ivy-100 text-ivy-900" : "border-line bg-surface text-ink-900 hover:border-ink-400",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </fieldset>
      <Field label="Message" htmlFor="c-message" error={errors.message}>
        <Textarea id="c-message" rows={5} value={v.message} onChange={(e) => set("message", e.target.value)} aria-invalid={!!errors.message} />
      </Field>
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-fit">
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
