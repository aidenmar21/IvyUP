"use client";

import { useState } from "react";
import { Check, Copy, Mail, MessageSquareText, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { smsHref } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-4 px-4 pt-8 pb-6 sm:flex-row sm:items-end sm:justify-between sm:px-8 lg:pt-12">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-4xl text-ink-900">{title}</h1>
        {description && <p className="text-ink-600">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({ title, body, action, icon: Icon }: { title: string; body: React.ReactNode; action?: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-line px-6 py-12 sm:px-8 animate-in fade-in duration-300">
      {Icon && <Icon className="size-6 text-ink-400" />}
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-2xl text-ink-900">{title}</h3>
        <div className="measure text-ink-600">{body}</div>
      </div>
      {action}
    </div>
  );
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success(`${label} copied`);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Couldn't copy. Select and copy it manually.");
        }
      }}
      className="relative flex size-9 shrink-0 items-center justify-center rounded-md text-ink-400 transition-colors after:absolute after:-inset-1 hover:bg-paper-2 hover:text-ink-900"
    >
      {copied ? <Check className="size-4 text-ivy-700" /> : <Copy className="size-4" />}
    </button>
  );
}

/** Phone number with tap-to-text (opens the owner's own Messages app) and copy. */
export function PhoneLine({ phone, smsBody, label = "Phone" }: { phone: string; smsBody?: string; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <a href={smsHref(phone, smsBody)} className="rounded-sm text-ink-900 tabular underline decoration-line underline-offset-4 hover:decoration-ink-400">
        {phone}
      </a>
      <CopyButton value={phone} label={label} />
    </span>
  );
}

export function EmailLine({ email }: { email: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <a href={`mailto:${email}`} className="truncate rounded-sm text-ink-900 underline decoration-line underline-offset-4 hover:decoration-ink-400">
        {email}
      </a>
      <CopyButton value={email} label="Email" />
    </span>
  );
}

const PREFS = {
  parentText: { icon: Smartphone, label: "Parent wants texts about sessions" },
  studentEmail: { icon: Mail, label: "Email student about sessions" },
  studentText: { icon: MessageSquareText, label: "Text student about sessions" },
} as const;

/** Contact-preference icons. Each shows only when that preference is on. */
export function PrefIcons({ parentText, studentEmail, studentText }: { parentText: boolean; studentEmail: boolean; studentText: boolean }) {
  const on = (Object.keys(PREFS) as (keyof typeof PREFS)[]).filter((k) => ({ parentText, studentEmail, studentText })[k]);
  if (on.length === 0) return null;
  return (
    <ul className="flex items-center gap-1" aria-label="Contact preferences">
      {on.map((k) => {
        const { icon: Icon, label } = PREFS[k];
        return (
          <li key={k}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  tabIndex={0}
                  aria-label={label}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md",
                    k === "parentText" ? "bg-brass-100 text-brass-700" : "bg-ivy-100 text-ivy-700",
                  )}
                >
                  <Icon className="size-4" />
                </span>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          </li>
        );
      })}
    </ul>
  );
}

export function StageDot({ tone }: { tone: "ivy" | "brass" | "ink" }) {
  return <span className={cn("size-2 rounded-full", tone === "ivy" ? "bg-ivy-700" : tone === "brass" ? "bg-brass-500" : "bg-ink-400")} aria-hidden />;
}

export function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ivy" | "brass" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold",
        tone === "ivy" && "bg-ivy-100 text-ivy-900",
        tone === "brass" && "bg-brass-100 text-brass-700",
        tone === "neutral" && "bg-paper-2 text-ink-600",
      )}
    >
      {children}
    </span>
  );
}

export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-4 border-b border-line py-2 text-sm last:border-b-0 sm:grid-cols-[160px_1fr]">
      <dt className="text-ink-600">{label}</dt>
      <dd className="min-w-0 text-ink-900 [overflow-wrap:anywhere]">{children ?? <span className="text-ink-400">—</span>}</dd>
    </div>
  );
}
