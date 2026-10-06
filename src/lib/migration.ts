import type { MealEntry, MacroTargets } from "./nutrition";

/**
 * Crash-safe guest → account migration.
 *
 * The rule this module exists to enforce:
 *
 *     read snapshot → send migration → confirm success → clear local data
 *
 * Never the other way around. If the network or the deployment is down, the
 * guest's session data stays exactly where it was and the user can retry.
 *
 * Idempotency is handled server-side with a batch key: every migration carries
 * a key that is stored alongside the imported rows, so replaying the same
 * attempt cannot duplicate anything even if a response is lost in flight.
 */

export type MigrationKind = "meals" | "activity";

export interface GuestActivityData {
  habits: Array<{ id: string; name: string; icon?: string }>;
  habitLogs: Array<{ habitId: string; date: string }>;
  water: Record<string, number>;
  weights: Array<{ date: string; kg: number }>;
  sessions: Array<{
    id: string;
    date: string;
    name: string;
    focus?: string;
    minutes: number;
    calories?: number;
  }>;
}

const BATCH_KEY_PREFIX = "vervefit-migration-batch-";

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * The batch key for this attempt. Stored in sessionStorage so a retry after a
 * failure reuses the same key (a replay is then a no-op server-side) while a
 * genuinely new migration gets a fresh one.
 */
export function getOrCreateBatchKey(
  kind: MigrationKind,
  storage: Storage | null = safeSessionStorage(),
): string {
  const storageKey = `${BATCH_KEY_PREFIX}${kind}`;
  const generated = `${kind}-${Date.now()}-${randomSuffix()}`;
  if (!storage) return generated;
  try {
    const existing = storage.getItem(storageKey);
    if (existing) return existing;
    storage.setItem(storageKey, generated);
    return generated;
  } catch {
    return generated;
  }
}

export function clearBatchKey(
  kind: MigrationKind,
  storage: Storage | null = safeSessionStorage(),
): void {
  if (!storage) return;
  try {
    storage.removeItem(`${BATCH_KEY_PREFIX}${kind}`);
  } catch {
    // ignore
  }
}

function safeSessionStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Shape the cloud mutation expects for a logged meal. */
export interface BulkMealEntry {
  date: string;
  mealType: MealEntry["mealType"];
  foodName: string;
  brand?: string;
  servingLabel?: string;
  servingSize: number;
  servingUnit: string;
  quantity: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** Maps local guest entries onto the migration payload. Pure. */
export function toBulkMealEntries(entries: MealEntry[]): BulkMealEntry[] {
  return entries
    .filter((e) => Boolean(e) && typeof e.date === "string" && Boolean(e.name))
    .map((e) => ({
      date: e.date,
      mealType: e.mealType,
      foodName: e.name,
      brand: e.brand,
      servingLabel: e.servingLabel,
      servingSize: e.servingSize,
      servingUnit: e.servingUnit,
      quantity: e.quantity,
      calories: e.calories,
      proteinG: e.proteinG,
      carbsG: e.carbsG,
      fatG: e.fatG,
    }));
}

export interface ActivityPayload {
  habits: Array<{ id: string; name: string; icon?: string }>;
  habitLogs: Array<{ habitId: string; date: string }>;
  water: Array<{ date: string; ml: number }>;
  weights: Array<{ date: string; kg: number }>;
  sessions: Array<{
    date: string;
    name: string;
    focus?: string;
    minutes: number;
    calories?: number;
  }>;
}

/** Maps the guest activity store onto the migration payload. Pure. */
export function toActivityPayload(data: GuestActivityData | null): ActivityPayload {
  if (!data) {
    return { habits: [], habitLogs: [], water: [], weights: [], sessions: [] };
  }
  return {
    habits: (data.habits ?? []).map((h) => ({
      id: h.id,
      name: h.name,
      icon: h.icon,
    })),
    habitLogs: (data.habitLogs ?? []).map((l) => ({
      habitId: l.habitId,
      date: l.date,
    })),
    water: Object.entries(data.water ?? {})
      .filter(([, ml]) => typeof ml === "number" && ml > 0)
      .map(([date, ml]) => ({ date, ml })),
    weights: (data.weights ?? []).map((w) => ({ date: w.date, kg: w.kg })),
    sessions: (data.sessions ?? []).map((s) => ({
      date: s.date,
      name: s.name,
      focus: s.focus,
      minutes: s.minutes,
      calories: s.calories,
    })),
  };
}

export function countActivityPayload(payload: ActivityPayload): number {
  return (
    payload.habits.length +
    payload.habitLogs.length +
    payload.water.length +
    payload.weights.length +
    payload.sessions.length
  );
}

export interface MealMigrationDeps {
  /** Non-destructive read of everything the guest logged. */
  readMeals: () => { entries: MealEntry[]; targets: MacroTargets | null };
  /** Sends the batch. Must reject when the write did not happen. */
  migrateMeals: (entries: BulkMealEntry[], batchKey: string) => Promise<void>;
  /** Only ever called after `migrateMeals` resolves. */
  clearMeals: () => void;
  batchKey: string;
}

export interface MealMigrationResult {
  attempted: number;
  cleared: boolean;
}

/**
 * Migrates guest meals. On any failure the local snapshot is left untouched
 * and the error is rethrown so the UI can offer a retry.
 */
export async function migrateGuestMeals(
  deps: MealMigrationDeps,
): Promise<MealMigrationResult> {
  const snapshot = deps.readMeals();
  const payload = toBulkMealEntries(snapshot.entries ?? []);
  if (payload.length === 0) {
    return { attempted: 0, cleared: false };
  }

  await deps.migrateMeals(payload, deps.batchKey);
  deps.clearMeals();
  return { attempted: payload.length, cleared: true };
}

export interface ActivityMigrationDeps {
  readActivity: () => GuestActivityData | null;
  migrateActivity: (payload: ActivityPayload, batchKey: string) => Promise<void>;
  clearActivity: () => void;
  batchKey: string;
}

export interface ActivityMigrationResult {
  attempted: number;
  cleared: boolean;
  payload: ActivityPayload;
}

export async function migrateGuestActivityData(
  deps: ActivityMigrationDeps,
): Promise<ActivityMigrationResult> {
  const payload = toActivityPayload(deps.readActivity());
  const attempted = countActivityPayload(payload);
  if (attempted === 0) {
    return { attempted: 0, cleared: false, payload };
  }

  await deps.migrateActivity(payload, deps.batchKey);
  deps.clearActivity();
  return { attempted, cleared: true, payload };
}
