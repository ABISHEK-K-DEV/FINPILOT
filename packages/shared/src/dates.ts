/**
 * Calendar date helpers.
 *
 * Transactions are stored with a calendar DATE ("YYYY-MM-DD") in the user's own
 * frame of reference, so month boundaries never shift with server time zones.
 * "Today" is always resolved in the user's configured IANA time zone.
 */

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  if (y < 1970 || y > 2100) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isValidMonthKey(value: string): boolean {
  if (!MONTH_PATTERN.test(value)) return false;
  const y = Number(value.slice(0, 4));
  return y >= 1970 && y <= 2100;
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Today's calendar date in the given IANA time zone, as YYYY-MM-DD. */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function monthKeyOf(date: string): string {
  return date.slice(0, 7);
}

export function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Inclusive first and last calendar day of a month. */
export function monthRange(monthKey: string): { start: string; end: string } {
  return {
    start: `${monthKey}-01`,
    end: `${monthKey}-${String(daysInMonth(monthKey)).padStart(2, "0")}`,
  };
}

export function addMonths(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number) as [number, number];
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

/** The `count` month keys ending with (and including) `endMonth`, oldest first. */
export function monthsEndingWith(endMonth: string, count: number): string[] {
  const result: string[] = [];
  for (let i = count - 1; i >= 0; i--) result.push(addMonths(endMonth, -i));
  return result;
}

/** Day-of-month component (1-31) of a YYYY-MM-DD string. */
export function dayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

/** Convert a YYYY-MM-DD calendar date to a UTC-midnight Date (for DATE columns). */
export function dateStringToUtcDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

/** Convert a DATE column value (UTC midnight) back to YYYY-MM-DD. */
export function utcDateToDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatMonthLabel(monthKey: string, locale = "en-IN", style: "long" | "short" = "long"): string {
  const [y, m] = monthKey.split("-").map(Number) as [number, number];
  return new Intl.DateTimeFormat(locale, { month: style, year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}
