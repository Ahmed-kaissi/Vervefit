/**
 * Canonical date + streak helpers.
 *
 * These live under `src/convex/lib` because both runtimes need them: the
 * Convex bundler only resolves modules inside the functions directory, and the
 * client imports them through the `@/` alias. Keeping one implementation means
 * the streak a user sees on the Habits tab is computed by exactly the same
 * code as the streak the coach reports.
 *
 * Everything here is local-time based. Dates are "YYYY-MM-DD" strings, which
 * sort lexicographically in chronological order.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE.test(value);
}

/** Local "YYYY-MM-DD" for a Date (avoids the UTC off-by-one of toISOString). */
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayStr(now: Date = new Date()): string {
  return toDateStr(now);
}

function parse(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Shift a "YYYY-MM-DD" string by n days (DST-safe: rebuilt from components). */
export function shiftDateStr(dateStr: string, n: number): string {
  const dt = parse(dateStr);
  dt.setDate(dt.getDate() + n);
  return toDateStr(dt);
}

/** Last n days ending at `endStr` (default today), oldest first. */
export function lastNDates(n: number, endStr: string = todayStr()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(shiftDateStr(endStr, -i));
  return out;
}

/** Monday-first weekday index: Monday = 0 … Sunday = 6. */
export function mondayIndexOf(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** Monday of the week containing `dateStr`, as an ISO date. */
export function startOfWeek(dateStr: string): string {
  return shiftDateStr(dateStr, -mondayIndexOf(parse(dateStr)));
}

/**
 * Consecutive days with activity, ending today — or yesterday when today is
 * still open, so a streak doesn't visibly reset each morning before the user
 * has done anything.
 */
export function computeStreak(activeDates: Iterable<string>, today: string): number {
  const set = activeDates instanceof Set ? activeDates : new Set(activeDates);
  let cursor = set.has(today) ? today : shiftDateStr(today, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = shiftDateStr(cursor, -1);
  }
  return streak;
}

/** Sorting comparator for ISO date strings (chronological, oldest first). */
export function compareIsoDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
