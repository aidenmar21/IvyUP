import { cn } from "@/lib/utils";

/**
 * IvyUp mark: the leaf from the original logo nested in an upward "J" arrow.
 * Single-color by default so it sits cleanly on paper or ivy backgrounds.
 */
export function LogoMark({ className, tone = "ivy" }: { className?: string; tone?: "ivy" | "paper" }) {
  const main = tone === "ivy" ? "var(--ivy-700)" : "var(--paper)";
  const leaf = tone === "ivy" ? "var(--ivy-700)" : "var(--ivy-200)";
  const rib = tone === "ivy" ? "var(--paper)" : "var(--ivy-900)";
  return (
    <svg viewBox="0 0 44 46" aria-hidden className={cn("shrink-0", className)}>
      <path d="M28 14v17c0 7-5 11-10 11-4 0-7-2-8.5-5" fill="none" stroke={main} strokeWidth="6" strokeLinecap="round" />
      <path d="M28 2.5 38 15H18z" fill={main} />
      <path d="M6.5 34.5C5.6 25.4 11 19 20.5 18c1 9.2-4.6 15.6-14 16.5z" fill={leaf} />
      <path d="M8 33 18.5 20" stroke={rib} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, tone = "ivy" }: { className?: string; tone?: "ivy" | "paper" }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="h-8 w-8" tone={tone} />
      <span
        className={cn(
          "font-display text-2xl leading-none font-semibold tracking-tight",
          tone === "ivy" ? "text-ink-900" : "text-paper",
        )}
      >
        Ivy<span className={tone === "ivy" ? "text-ivy-700" : "text-ivy-200"}>Up</span>
      </span>
    </span>
  );
}
