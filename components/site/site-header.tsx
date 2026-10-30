"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/tutors", label: "Meet the tutors" },
  { href: "/contact", label: "Contact" },
  { href: "/apply", label: "Apply to tutor" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const onForm = pathname === "/get-started" || pathname === "/apply";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-paper/95 transition-[border-color,box-shadow] duration-300 ease-soft supports-[backdrop-filter]:bg-paper/85 supports-[backdrop-filter]:backdrop-blur-md",
        scrolled ? "border-line shadow-[0_1px_0_rgb(26_28_24/0.03)]" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-8">
        <Link href="/" aria-label="IvyUp home" className="flex min-h-11 items-center rounded-md">
          <Logo />
        </Link>

        {!onForm && (
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-4 py-2 text-sm font-medium text-ink-600 transition-colors duration-200 hover:text-ink-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {onForm ? (
            <Link href="/" className="rounded-md px-2 py-2 text-sm font-medium text-ink-600 hover:text-ink-900">
              Back to site
            </Link>
          ) : (
            <>
              <Button asChild className="hidden sm:inline-flex">
                <Link href="/get-started">Find a tutor</Link>
              </Button>
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                    <Menu />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full max-w-sm bg-paper px-6 pt-20">
                  <SheetTitle className="sr-only">Menu</SheetTitle>
                  <nav aria-label="Mobile" className="flex flex-col">
                    {NAV.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="border-b border-line py-4 font-display text-2xl text-ink-900"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </nav>
                  <Button asChild size="lg" className="mt-8 w-full">
                    <Link href="/get-started">Find a tutor</Link>
                  </Button>
                </SheetContent>
              </Sheet>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
