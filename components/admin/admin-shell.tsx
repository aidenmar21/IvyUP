"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, GraduationCap, Inbox, LogOut, MessageSquareQuote, Search, UserRoundPlus, Users } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { LogoMark } from "@/components/shared/logo";
import { signOut } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

type SearchItem = { id: string; label: string; sub: string; stage?: string };
export type SearchIndex = { students: SearchItem[]; tutors: SearchItem[]; applications: SearchItem[] };
export type Counts = { newForms: number; newApps: number; unread: number };

const NAV = [
  { href: "/admin/prospects", label: "Prospects", icon: Users, key: "p", count: "newForms" },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays, key: "c" },
  { href: "/admin/tutors", label: "Tutors", icon: GraduationCap, key: "t", count: "newApps" },
  { href: "/admin/displays", label: "Tutor displays", short: "Displays", icon: UserRoundPlus, key: "d" },
  { href: "/admin/testimonials", label: "Testimonials", short: "Reviews", icon: MessageSquareQuote, key: "r" },
  { href: "/admin/inbox", label: "Inbox", icon: Inbox, key: "i", count: "unread" },
] as const;

export function AdminShell({ children, counts, index, ownerName }: { children: React.ReactNode; counts: Counts; index: SearchIndex; ownerName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const gPressed = useRef<number>(0);

  // ⌘K / Ctrl+K opens search; "g" then a letter jumps between sections.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing = target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (e.key === "g") {
        gPressed.current = Date.now();
        return;
      }
      if (Date.now() - gPressed.current < 800) {
        const item = NAV.find((n) => n.key === e.key.toLowerCase());
        if (item) {
          gPressed.current = 0;
          router.push(item.href);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <div className="flex min-h-dvh bg-paper">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
        <Link href="/admin/prospects" className="flex items-center gap-2 px-2">
          <LogoMark className="size-8" />
          <span className="font-display text-xl text-ink-900">
            Ivy<span className="text-ivy-700">Up</span>
          </span>
          <span className="ml-auto rounded-sm bg-paper-2 px-2 py-0.5 text-xs font-semibold text-ink-600">Owner</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-8 flex h-11 items-center gap-2 rounded-md border border-line bg-paper px-4 text-sm text-ink-600 transition-colors hover:border-ink-400 hover:text-ink-900"
        >
          <Search className="size-4" />
          Search
          <kbd className="ml-auto rounded-sm border border-line bg-surface px-1.5 font-sans text-xs text-ink-600">⌘K</kbd>
        </button>
        <nav aria-label="Dashboard" className="mt-6 flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            const count = "count" in item ? counts[item.count] : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors duration-200",
                  active ? "bg-ivy-100 text-ivy-900" : "text-ink-600 hover:bg-paper-2 hover:text-ink-900",
                )}
              >
                <item.icon className={cn("size-4", active ? "text-ivy-700" : "text-ink-400 group-hover:text-ink-600")} />
                {item.label}
                {count > 0 ? (
                  <span className="ml-auto min-w-6 rounded-full bg-ivy-700 px-2 py-0.5 text-center text-xs font-semibold text-paper tabular">{count}</span>
                ) : (
                  <kbd className="ml-auto hidden font-sans text-xs text-ink-400 group-hover:inline">G {item.key.toUpperCase()}</kbd>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-1 border-t border-line pt-4">
          <p className="truncate px-3 text-sm text-ink-600">{ownerName}</p>
          <form action={signOut}>
            <button
              type="submit"
              className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold text-ink-600 transition-colors hover:bg-paper-2 hover:text-ink-900"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur-md lg:hidden">
          <Link href="/admin/prospects" className="flex items-center gap-2">
            <LogoMark className="size-7" />
            <span className="font-display text-lg">Owner</span>
          </Link>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Search"
              className="flex size-11 items-center justify-center rounded-md text-ink-600"
            >
              <Search className="size-5" />
            </button>
            <form action={signOut}>
              <button type="submit" aria-label="Sign out" className="flex size-11 items-center justify-center rounded-md text-ink-600">
                <LogOut className="size-5" />
              </button>
            </form>
          </div>
        </div>
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Mobile tab bar */}
      <nav
        aria-label="Dashboard"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-line bg-surface/95 backdrop-blur-md safe-bottom lg:hidden"
      >
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          const count = "count" in item ? counts[item.count] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold",
                active ? "text-ivy-700" : "text-ink-600",
              )}
            >
              <item.icon className="size-5" />
              {"short" in item ? item.short : item.label}
              {count > 0 && <span className="absolute top-2 right-[calc(50%-18px)] size-2 rounded-full bg-ivy-700" />}
            </Link>
          );
        })}
      </nav>

      <CommandDialog open={open} onOpenChange={setOpen} title="Search IvyUp" description="Jump to a section, student, or tutor">
        <Command>
          <CommandInput placeholder="Search students, tutors, sections…" />
          <CommandList>
            <CommandEmpty>Nothing matches that.</CommandEmpty>
            <CommandGroup heading="Go to">
              {NAV.map((item) => (
                <CommandItem key={item.href} value={`go ${item.label}`} onSelect={() => go(item.href)} className="min-h-11">
                  <item.icon />
                  {item.label}
                  <CommandShortcut>G {item.key.toUpperCase()}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
            {index.students.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Students">
                  {index.students.map((s) => (
                    <CommandItem
                      key={s.id}
                      value={`student ${s.label} ${s.sub} ${s.id}`}
                      onSelect={() => go(`/admin/prospects?student=${s.id}`)}
                      className="min-h-11"
                    >
                      <span className="font-semibold">{s.label}</span>
                      <span className="text-ink-600">{s.sub}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
            {index.tutors.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Tutors">
                  {index.tutors.map((t) => (
                    <CommandItem key={t.id} value={`tutor ${t.label} ${t.sub} ${t.id}`} onSelect={() => go(`/admin/tutors/${t.id}`)} className="min-h-11">
                      <span className="font-semibold">{t.label}</span>
                      <span className="text-ink-600">{t.sub}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
            {index.applications.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Tutor applications">
                  {index.applications.map((a) => (
                    <CommandItem
                      key={a.id}
                      value={`application ${a.label} ${a.sub} ${a.id}`}
                      onSelect={() => go(`/admin/tutors?app=${a.id}`)}
                      className="min-h-11"
                    >
                      <span className="font-semibold">{a.label}</span>
                      <span className="text-ink-600">{a.sub}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  );
}
