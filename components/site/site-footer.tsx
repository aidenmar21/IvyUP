import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-ivy-900 text-ivy-100">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Logo tone="paper" />
          <p className="measure max-w-sm text-sm text-ivy-200">
            One-on-one tutoring from current Ivy League students for the SAT, PSAT, ACT, SHSAT, SSAT, ISEE and AP exams.
          </p>
          <a href="mailto:hello@ivyup.org" className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-paper underline decoration-ivy-700 decoration-2 underline-offset-4 hover:decoration-ivy-200">
            hello@ivyup.org
          </a>
        </div>
        <nav aria-label="Families" className="flex flex-col text-sm">
          <p className="eyebrow pb-2 text-ivy-200">Families</p>
          <FooterLink href="/get-started">Find a tutor</FooterLink>
          <FooterLink href="/#how-it-works">How it works</FooterLink>
          <FooterLink href="/tutors">Meet the tutors</FooterLink>
          <FooterLink href="/contact">Contact</FooterLink>
        </nav>
        <nav aria-label="Tutors and legal" className="flex flex-col text-sm">
          <p className="eyebrow pb-2 text-ivy-200">IvyUp</p>
          <FooterLink href="/apply">Apply to tutor</FooterLink>
          <FooterLink href="/privacy">Privacy Policy</FooterLink>
          <FooterLink href="/terms">Terms of Use</FooterLink>
          <FooterLink href="/tutor/login">Tutor sign in</FooterLink>
        </nav>
      </div>
      <div className="border-t border-ivy-800">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-ivy-200 sm:px-8 safe-bottom">
          © {year} IvyUp. IvyUp is an independent tutoring service and is not affiliated with or endorsed by any university.
        </p>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex min-h-11 w-fit items-center text-ivy-100 transition-colors duration-200 hover:text-paper">
      {children}
    </Link>
  );
}
