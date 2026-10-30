"use client";

import { useId, useState } from "react";
import { Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function useIdempotencyKey() {
  const [key, setKey] = useState(() => crypto.randomUUID());
  return { key, renew: () => setKey(crypto.randomUUID()) };
}

/** Label + control + hint/error, with the error sliding in. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  optionalLabel = "optional",
  children,
  className,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string;
  optional?: boolean;
  optionalLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-4 text-sm font-semibold text-ink-900">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-ink-600">{optionalLabel}</span>}
      </label>
      {children}
      {hint && !error && <p className="text-sm text-ink-600">{hint}</p>}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-soft",
          error ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <p id={errorId} role={error ? "alert" : undefined} className="overflow-hidden text-sm font-medium text-danger">
          {error}
        </p>
      </div>
    </div>
  );
}

/** Toggle chip for multi-select lists (tests, subjects). 44px tall. */
export function ChoiceChip({
  selected,
  onToggle,
  children,
  description,
}: {
  selected: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={cn(
        "group inline-flex min-h-11 items-center gap-2 rounded-md border px-4 py-2 text-left text-sm font-semibold transition-[background-color,border-color,color,transform] duration-200 ease-soft active:scale-[0.98]",
        selected
          ? "border-ivy-700 bg-ivy-100 text-ivy-900"
          : "border-line bg-surface text-ink-900 hover:border-ink-400",
      )}
    >
      <span
        className={cn(
          "flex size-4 items-center justify-center rounded-sm border transition-[background-color,border-color] duration-200",
          selected ? "border-ivy-700 bg-ivy-700 text-paper" : "border-ink-400",
        )}
        aria-hidden
      >
        <Check className={cn("size-3 transition-transform duration-200 ease-soft", selected ? "scale-100" : "scale-0")} strokeWidth={3} />
      </span>
      <span className="flex flex-col">
        <span>{children}</span>
        {description && <span className="text-xs font-normal text-ink-600">{description}</span>}
      </span>
    </button>
  );
}

/** Checkbox with a full-row 44px hit area. */
export function CheckRow({
  checked,
  onCheckedChange,
  children,
  hint,
  invalid,
  className,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  children: React.ReactNode;
  hint?: React.ReactNode;
  invalid?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex min-h-11 items-start gap-4 py-2", className)}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        aria-invalid={invalid || undefined}
        className="mt-0.5"
      />
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="cursor-pointer text-base text-ink-900">
          {children}
        </label>
        {hint && <div className="text-sm text-ink-600">{hint}</div>}
      </div>
    </div>
  );
}

/** Success check whose circle and tick draw in sequence. */
export function SuccessCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-16", className)} aria-hidden>
      <circle
        cx="32"
        cy="32"
        r="29"
        fill="none"
        stroke="var(--ivy-700)"
        strokeWidth="3"
        strokeDasharray="183"
        strokeDashoffset="183"
        className="animate-[draw_600ms_var(--ease-soft)_forwards]"
      />
      <path
        d="M20 33l8 8 16-17"
        fill="none"
        stroke="var(--ivy-700)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="40"
        strokeDashoffset="40"
        className="animate-[draw_400ms_var(--ease-soft)_450ms_forwards]"
      />
      <style>{`@keyframes draw{to{stroke-dashoffset:0}}`}</style>
    </svg>
  );
}

export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Website
        <input tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}
