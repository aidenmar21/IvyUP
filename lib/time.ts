import { addDays, addWeeks, differenceInCalendarDays, format, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { TIME_ZONE } from "@/lib/constants";
import type { CalendarEvent, Occurrence } from "@/lib/types";

export const tz = TIME_ZONE;

/** "2026-11-02" + "16:30" in Eastern Time → UTC ISO string */
export function etToUtc(date: string, time: string) {
  return fromZonedTime(`${date}T${time}:00`, tz).toISOString();
}

export function etDate(iso: string | Date) {
  return formatInTimeZone(iso, tz, "yyyy-MM-dd");
}

export function etTime(iso: string | Date) {
  return formatInTimeZone(iso, tz, "HH:mm");
}

export function fmt(iso: string | Date, pattern: string) {
  return formatInTimeZone(iso, tz, pattern);
}

/** "Tue, Nov 3 · 4:30 PM ET" */
export function fmtWhen(iso: string | Date) {
  return `${formatInTimeZone(iso, tz, "EEE, MMM d · h:mm a")} ET`;
}

export function fmtRange(startIso: string, endIso: string) {
  return `${formatInTimeZone(startIso, tz, "h:mm")}–${formatInTimeZone(endIso, tz, "h:mm a")}`;
}

export function todayEt() {
  return etDate(new Date());
}

/**
 * Expands events into concrete occurrences between two ET calendar dates
 * (inclusive). Weekly events keep their Eastern wall-clock time across
 * daylight-saving changes.
 */
export function expandOccurrences(events: CalendarEvent[], fromDate: string, toDate: string): Occurrence[] {
  const out: Occurrence[] = [];
  for (const event of events) {
    const startDate = etDate(event.starts_at);
    const startTime = etTime(event.starts_at);
    const durationMs = parseISO(event.ends_at).getTime() - parseISO(event.starts_at).getTime();

    if (event.recurrence !== "weekly") {
      if (startDate >= fromDate && startDate <= toDate) {
        out.push({ key: `${event.id}:${startDate}`, event, date: startDate, starts_at: event.starts_at, ends_at: event.ends_at });
      }
      continue;
    }

    const until = event.recurrence_until && event.recurrence_until < toDate ? event.recurrence_until : toDate;
    const base = parseISO(`${startDate}T12:00:00`);
    const from = parseISO(`${fromDate}T12:00:00`);
    const skipWeeks = Math.max(0, Math.floor(differenceInCalendarDays(from, base) / 7));
    for (let i = skipWeeks; ; i++) {
      const date = format(addWeeks(base, i), "yyyy-MM-dd");
      if (date > until) break;
      if (date < fromDate) continue;
      const starts = etToUtc(date, startTime);
      const ends = new Date(new Date(starts).getTime() + durationMs).toISOString();
      out.push({ key: `${event.id}:${date}`, event, date, starts_at: starts, ends_at: ends });
    }
  }
  return out.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

export function shiftDate(date: string, days: number) {
  return format(addDays(parseISO(`${date}T12:00:00`), days), "yyyy-MM-dd");
}
