import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { FOOD_DATABASE } from "@/lib/food-database";
import { guestStore, makeLocalId } from "@/lib/guest-store";
import {
  clearBatchKey,
  getOrCreateBatchKey,
  migrateGuestMeals,
} from "@/lib/migration";
import type { FoodItem, MacroTargets, MealEntry, MealType } from "@/lib/nutrition";
import { DEFAULT_TARGETS, lastNDates, todayStr } from "@/lib/nutrition";

export interface DateTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface FoodSearchResult extends FoodItem {
  /** Present when the food lives in the shared cloud database. */
  cloudId?: string;
}

/** Shape of a row as Convex returns it (documents carry `_id`, not `id`). */
interface CloudEntry {
  _id: string;
  _creationTime: number;
  date: string;
  mealType: MealType;
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

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

/**
 * Coerce anything into a valid local "YYYY-MM-DD".
 * Guards against the caller passing a label ("today") or a bad Date, which
 * would otherwise produce "NaN-NaN-NaN" keys downstream.
 */
export function normalizeDate(input: unknown): string {
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return todayStr();
  }
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }
  return todayStr();
}

export function totalsOf(entries: MealEntry[]): DateTotals {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      proteinG: acc.proteinG + e.proteinG,
      carbsG: acc.carbsG + e.carbsG,
      fatG: acc.fatG + e.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

/** Map a Convex document onto the MealEntry shape the UI renders. */
function toMealEntry(row: CloudEntry): MealEntry {
  return {
    id: row._id,
    date: row.date,
    mealType: MEAL_TYPES.includes(row.mealType) ? row.mealType : "snack",
    quantity: row.quantity,
    loggedAt: row._creationTime,
    name: row.foodName,
    brand: row.brand,
    category: "Other",
    servingSize: row.servingSize,
    servingUnit: row.servingUnit,
    servingLabel: row.servingLabel,
    calories: row.calories,
    proteinG: row.proteinG,
    carbsG: row.carbsG,
    fatG: row.fatG,
  };
}

function searchLocalFoods(term: string): FoodSearchResult[] {
  const t = term.trim().toLowerCase();
  if (!t) return [];
  return FOOD_DATABASE.filter((f) => f.name.toLowerCase().includes(t))
    .sort((a, b) => {
      const ai = a.name.toLowerCase().indexOf(t);
      const bi = b.name.toLowerCase().indexOf(t);
      if (ai !== bi) return ai - bi;
      return a.name.length - b.name.length;
    })
    .slice(0, 20)
    .map((f) => ({ ...f }));
}

const POPULAR_NAMES = [
  "Chicken Breast, Grilled",
  "Banana",
  "Large Egg",
  "White Rice, Cooked",
  "Greek Yogurt, Plain",
  "Rolled Oats, Dry",
  "Avocado",
  "Whole Wheat Bread",
  "Almonds",
  "Salmon Fillet",
  "Cottage Cheese, Low-Fat",
  "Peanut Butter",
];

const POPULAR_LOCAL: FoodSearchResult[] = POPULAR_NAMES.map((n) =>
  FOOD_DATABASE.find((f) => f.name === n),
)
  .filter((f): f is FoodItem => Boolean(f))
  .map((f) => ({ ...f }));

export function useFoodLog(dateInput: string) {
  const date = useMemo(() => normalizeDate(dateInput), [dateInput]);
  const { isLoading, isAuthenticated, user } = useAuth();
  const isGuest = !isLoading && !isAuthenticated;
  const ready = !isLoading;

  const [guestEntries, setGuestEntries] = useState<MealEntry[]>([]);
  const [guestTargets, setGuestTargets] = useState<MacroTargets | null>(null);
  // Total items still held locally, shown while a migration is pending.
  const [guestPendingCount, setGuestPendingCount] = useState(0);
  // Every guest entry, not just today's — the week chart needs the whole set.
  // It is mirrored into state so renders never read sessionStorage directly.
  const [guestAllEntries, setGuestAllEntries] = useState<MealEntry[]>([]);

  useEffect(() => {
    if (!isGuest) return;
    const sync = () => {
      const snapshot = guestStore.snapshot();
      setGuestAllEntries(snapshot.entries);
      setGuestEntries(
        snapshot.entries.filter((entry) => entry.date === date),
      );
      setGuestTargets(guestStore.getTargets());
      setGuestPendingCount(snapshot.entries.length);
    };
    sync();
    return guestStore.subscribe(sync);
  }, [isGuest, date]);

  const cloudDay = useQuery(
    api.meals.getDay,
    isGuest ? "skip" : { date },
  ) as CloudEntry[] | undefined | null;

  const weekStart = useMemo(() => lastNDates(7, date)[0], [date]);
  const cloudWeek = useQuery(
    api.meals.getRange,
    isGuest ? "skip" : { start: weekStart, end: date },
  ) as CloudEntry[] | undefined | null;

  const addMutation = useMutation(api.meals.add);
  const removeMutation = useMutation(api.meals.remove);
  const updateGoalsMutation = useMutation(api.users.updateGoals);
  const migrateMutation = useMutation(api.meals.bulkAdd);

  const entries: MealEntry[] = useMemo(() => {
    if (isGuest) return guestEntries;
    return (cloudDay ?? []).map(toMealEntry);
  }, [isGuest, guestEntries, cloudDay]);

  const totals = useMemo(() => totalsOf(entries), [entries]);

  const targets: MacroTargets = useMemo(() => {
    if (isGuest) return guestTargets ?? DEFAULT_TARGETS;
    const u = user as
      | {
          dailyCalorieTarget?: number;
          proteinTargetG?: number;
          carbsTargetG?: number;
          fatTargetG?: number;
        }
      | null;
    return {
      dailyCalorieTarget: u?.dailyCalorieTarget ?? DEFAULT_TARGETS.dailyCalorieTarget,
      proteinTargetG: u?.proteinTargetG ?? DEFAULT_TARGETS.proteinTargetG,
      carbsTargetG: u?.carbsTargetG ?? DEFAULT_TARGETS.carbsTargetG,
      fatTargetG: u?.fatTargetG ?? DEFAULT_TARGETS.fatTargetG,
    };
  }, [isGuest, guestTargets, user]);

  const weekTotals: Record<string, DateTotals> = useMemo(() => {
    const out: Record<string, DateTotals> = {};
    for (const d of lastNDates(7, date)) {
      out[d] = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
    }
    const source: MealEntry[] = isGuest
      ? guestAllEntries
      : (cloudWeek ?? []).map(toMealEntry);
    for (const entry of source) {
      const bucket = out[entry.date];
      if (bucket) {
        bucket.calories += entry.calories;
        bucket.proteinG += entry.proteinG;
        bucket.carbsG += entry.carbsG;
        bucket.fatG += entry.fatG;
      }
    }
    return out;
  }, [isGuest, guestAllEntries, cloudWeek, date]);

  const addEntry = useCallback(
    async (
      food: FoodSearchResult,
      mealType: MealType,
      dateArg: string,
      quantity: number,
    ) => {
      const q = Math.max(0.1, quantity);
      const day = normalizeDate(dateArg);
      const round1 = (n: number) => Math.round(n * 10) / 10;
      if (isGuest) {
        guestStore.addEntry({
          id: makeLocalId(),
          date: day,
          mealType,
          quantity: q,
          loggedAt: Date.now(),
          name: food.name,
          brand: food.brand,
          category: food.category ?? "Other",
          servingSize: food.servingSize,
          servingUnit: food.servingUnit,
          servingLabel: food.servingLabel,
          calories: Math.round(food.calories * q),
          proteinG: round1(food.proteinG * q),
          carbsG: round1(food.carbsG * q),
          fatG: round1(food.fatG * q),
        });
        return;
      }
      await addMutation({
        date: day,
        mealType,
        foodName: food.name,
        brand: food.brand,
        servingLabel: food.servingLabel,
        servingSize: food.servingSize,
        servingUnit: food.servingUnit,
        quantity: q,
        calories: Math.round(food.calories * q),
        proteinG: round1(food.proteinG * q),
        carbsG: round1(food.carbsG * q),
        fatG: round1(food.fatG * q),
      });
    },
    [isGuest, addMutation],
  );

  const removeEntry = useCallback(
    async (id: string) => {
      if (!id) return;
      if (isGuest) {
        guestStore.removeEntry(id);
        return;
      }
      await removeMutation({ id } as never);
    },
    [isGuest, removeMutation],
  );

  const saveTargets = useCallback(
    async (t: MacroTargets, mainGoal?: string) => {
      if (isGuest) {
        guestStore.setTargets(t);
        return;
      }
      await updateGoalsMutation({
        dailyCalorieTarget: Math.round(t.dailyCalorieTarget),
        proteinTargetG: Math.round(t.proteinTargetG),
        carbsTargetG: Math.round(t.carbsTargetG),
        fatTargetG: Math.round(t.fatTargetG),
        mainGoal: mainGoal ?? "Get Healthier",
        fitnessLevel: "beginner",
      });
    },
    [isGuest, updateGoalsMutation],
  );

  /**
   * Moves guest meals into the account.
   *
   * The guest store is only cleared once the server has confirmed the write,
   * so a failed import keeps the data and can be retried. The batch key makes
   * a retry idempotent even if the first response was lost after it committed.
   */
  const migrateGuestData = useCallback(async () => {
    const batchKey = getOrCreateBatchKey("meals");
    try {
      const result = await migrateGuestMeals({
        readMeals: () => guestStore.snapshot(),
        migrateMeals: async (entries, key) => {
          await migrateMutation({ entries, batchKey: key });
        },
        clearMeals: () => guestStore.clearEntries(),
        batchKey,
      });
      if (result.cleared) clearBatchKey("meals");
      return { ok: true, count: result.attempted };
    } catch (err) {
      // Guest data is still in sessionStorage — surface the failure so the UI
      // can offer a retry instead of silently dropping the log.
      console.error("[use-food-log] guest meal migration failed:", err);
      throw err;
    }
  }, [migrateMutation]);

  return {
    date,
    entries,
    totals,
    targets,
    isGuest,
    ready,
    addEntry,
    removeEntry,
    saveTargets,
    weekTotals,
    migrateGuestData,
    /** How many logged items are still waiting to move to an account. */
    guestPendingCount,
    searchLocal: searchLocalFoods,
    popularLocal: POPULAR_LOCAL,
  };
}
