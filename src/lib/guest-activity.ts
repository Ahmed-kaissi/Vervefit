// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const HABIT_KEY = "vervefit-guest-habits";
const WATER_KEY = "vervefit-guest-water";
const WEIGHT_KEY = "vervefit-guest-weight";
const SESSION_KEY = "vervefit-guest-sessions";
const CHECKIN_KEY = "vervefit-daily-checkin";

// ---------------------------------------------------------------------------
// Tiny pub/sub so hooks can react to guest-data changes without polling
// sessionStorage during render.
// ---------------------------------------------------------------------------

const listeners = new Set<() => void>();

function notify() {
  // Copy the set so a subscriber that mutates the set during notification
  // does not produce a concurrent-modification error.
  for (const fn of Array.from(listeners)) {
    fn();
  }
}

// ---------------------------------------------------------------------------
// Habits + habit logs
// ---------------------------------------------------------------------------

export interface GuestHabit {
  id: string;
  name: string;
  icon?: string;
}

export interface GuestHabitLog {
  habitId: string;
  date: string;
}

const GUEST_HABIT_IDS = new Set<string>();

function habitKey(id: string): string {
  return `${HABIT_KEY}:${id}`;
}

function getHabitsRaw(): GuestHabit[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(HABIT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GuestHabit[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (h): h is GuestHabit =>
        Boolean(h && typeof h === "object" && typeof h.id === "string"),
    );
  } catch {
    return [];
  }
}

function setHabitsRaw(habits: GuestHabit[]) {
  try {
    window.sessionStorage.setItem(HABIT_KEY, JSON.stringify(habits));
  } catch {
    /* best-effort */
  }
}

export function getHabits(): GuestHabit[] {
  return getHabitsRaw();
}

export function addHabit(name: string, icon?: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const habits = getHabits();
  if (habits.some((h) => h.name === trimmed)) return;
  const id = `gh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const next = [
    ...habits,
    { id, name: trimmed, icon: icon ?? "✅" },
  ];
  setHabitsRaw(next);
  notify();
}

export function removeHabit(id: string) {
  setHabitsRaw(getHabits().filter((h) => h.id !== id));
  // Drop any logs for this habit so stale data does not linger.
  removeHabitLogsFor(id);
  notify();
}

function habitLogsKey(habitId: string): string {
  return `${HABIT_KEY}-logs:${habitId}`;
}

function getHabitLogsFor(habitId: string): GuestHabitLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(habitLogsKey(habitId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GuestHabitLog[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is GuestHabitLog =>
        Boolean(l && typeof l.habitId === "string" && typeof l.date === "string"),
    );
  } catch {
    return [];
  }
}

function setHabitLogsFor(habitId: string, logs: GuestHabitLog[]) {
  try {
    window.sessionStorage.setItem(
      habitLogsKey(habitId),
      JSON.stringify(logs),
    );
  } catch {
    /* best-effort */
  }
}

export function getHabitLogs(): GuestHabitLog[] {
  const habits = getHabits();
  return habits.flatMap((h) =>
    getHabitLogsFor(h.id).map((l) => ({ ...l, habitId: h.id })),
  );
}

export function toggleHabit(habitId: string, date: string) {
  const habits = getHabits();
  const habit = habits.find((h) => h.id === habitId);
  if (!habit) return;

  const logs = getHabitLogsFor(habitId);
  const existing = logs.find((l) => l.date === date);
  const nextLogs = existing
    ? logs.filter((l) => l.date !== date)
    : [...logs, { habitId, date }];

  setHabitLogsFor(habitId, nextLogs);
  notify();
}

function removeHabitLogsFor(habitId: string) {
  try {
    window.sessionStorage.removeItem(habitLogsKey(habitId));
  } catch {
    /* best-effort */
  }
}

// ---------------------------------------------------------------------------
// Water
// ---------------------------------------------------------------------------

export function getWater(date: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.sessionStorage.getItem(`${WATER_KEY}:${date}`);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { ml: number };
    return Number.isFinite(parsed?.ml) ? parsed.ml : 0;
  } catch {
    return 0;
  }
}

export function addWater(date: string, ml: number) {
  const key = `${WATER_KEY}:${date}`;
  const previous = getWater(date);
  const next = Math.max(0, previous + ml);
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ ml: next }));
  } catch {
    /* best-effort */
  }
  notify();
}

// ---------------------------------------------------------------------------
// Weight
// ---------------------------------------------------------------------------

export interface GuestWeight {
  date: string;
  kg: number;
}

export function getWeights(): GuestWeight[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(WEIGHT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GuestWeight[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (w): w is GuestWeight =>
        Boolean(w && typeof w.date === "string" && Number.isFinite(w.kg)),
    );
  } catch {
    return [];
  }
}

export function setWeight(date: string, kg: number) {
  const weights = getWeights();
  const next = weights.filter((w) => w.date !== date);
  next.push({ date, kg });
  try {
    window.sessionStorage.setItem(WEIGHT_KEY, JSON.stringify(next));
  } catch {
    /* best-effort */
  }
  notify();
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export interface GuestSession {
  id: string;
  date: string;
  name: string;
  focus?: string;
  minutes: number;
  calories?: number;
}

export function getSessions(): GuestSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GuestSession[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is GuestSession =>
        Boolean(
          s &&
            typeof s.id === "string" &&
            typeof s.date === "string" &&
            typeof s.name === "string" &&
            Number.isFinite(s.minutes),
        ),
    );
  } catch {
    return [];
  }
}

export function addSession(session: GuestSession) {
  const sessions = getSessions();
  if (sessions.some((s) => s.id === session.id)) return;
  session.id = session.id || `gs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  setSessionsRaw([...sessions, session]);
  notify();
}

export function removeSession(id: string) {
  setSessionsRaw(getSessions().filter((s) => s.id !== id));
  notify();
}

function setSessionsRaw(sessions: GuestSession[]) {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
  } catch {
    /* best-effort */
  }
}

// ---------------------------------------------------------------------------
// Daily check-in
// ---------------------------------------------------------------------------

export interface DailyCheckinRow {
  date: string;
  at: number;
}

export function getCheckin(date: string): DailyCheckinRow | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CHECKIN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailyCheckinRow;
    if (!parsed || parsed.date !== date) return null;
    return parsed;
  } catch {
    return null;
  }
}export function setCheckin(date: string) {
  const existing = getCheckin(date);
  const next: DailyCheckinRow = {
    date,
    at: existing ? Math.max(existing.at, Date.now()) : Date.now(),
  };
  try {
    window.sessionStorage.setItem(CHECKIN_KEY, JSON.stringify(next));
  } catch {
    /* best-effort */
  }
  notify();
}

/**
 * Log a check-in as a habit completion so the streak (computed from habit
 * logs by `computeStreak`) picks it up. The "Daily check-in" habit is
 * created automatically on first use.
 */
export function logCheckinAsHabit(date: string) {
  const CHECKIN_HABIT_NAME = "Daily check-in";
  let habits = getHabits();
  let habit = habits.find((h) => h.name === CHECKIN_HABIT_NAME);
  if (!habit) {
    const id = `gh-checkin-${Date.now()}`;
    habit = { id, name: CHECKIN_HABIT_NAME, icon: "🔥" };
    habits = [...habits, habit];
    setHabitsRaw(habits);
  }
  toggleHabit(habit.id, date);
}

export function clearCheckin() {
  try {
    window.sessionStorage.removeItem(CHECKIN_KEY);
  } catch {
    /* best-effort */
  }
  notify();
}

// ---------------------------------------------------------------------------
// Bulk access for migrations and debugging
// ---------------------------------------------------------------------------

function currentDate() {
  if (typeof window === "undefined") {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

// snapForMigration returns the shape migrateGuestActivityData expects.
export function snapshotForMigration() {
  return {
    habits: getHabits(),
    habitLogs: getHabitLogs(),
    weights: getWeights(),
    sessions: getSessions(),
    checkin: getCheckin(currentDate()),
    water: { [currentDate()]: getWater(currentDate()) },
  };
}

export function clearAll() {
  try {
    window.sessionStorage.removeItem(HABIT_KEY);
  } catch {
    /* best-effort */
  }
  try {
    window.sessionStorage.removeItem(WATER_KEY);
  } catch {
    /* best-effort */
  }
  try {
    window.sessionStorage.removeItem(WEIGHT_KEY);
  } catch {
    /* best-effort */
  }
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* best-effort */
  }
  try {
    window.sessionStorage.removeItem(CHECKIN_KEY);
  } catch {
    /* best-effort */
  }
  notify();
}

// ---------------------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------------------

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function clear() {
  listeners.forEach((fn) => fn());
}

