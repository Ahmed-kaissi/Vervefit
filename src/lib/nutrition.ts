export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export const MEAL_META: Record<
  MealType,
  { label: string; icon: string; hint: string }
> = {
  breakfast: { label: "Breakfast", icon: "🌅", hint: "Start strong" },
  lunch: { label: "Lunch", icon: "🥗", hint: "Refuel midday" },
  dinner: { label: "Dinner", icon: "🍲", hint: "Wind down" },
  snack: { label: "Snacks", icon: "🍎", hint: "Stay energized" },
};

export interface FoodItem {
  name: string;
  brand?: string;
  category: string;
  servingSize: number;
  servingUnit: string;
  servingLabel?: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MealEntry extends FoodItem {
  id: string;
  date: string; // "YYYY-MM-DD" local
  mealType: MealType;
  quantity: number;
  loggedAt: number;
}

export interface MacroTargets {
  dailyCalorieTarget: number;
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
}

export const DEFAULT_TARGETS: MacroTargets = {
  dailyCalorieTarget: 2000,
  proteinTargetG: 150,
  carbsTargetG: 200,
  fatTargetG: 65,
};

export const MAIN_GOALS = [
  "Lose Weight",
  "Build Muscle",
  "Improve Endurance",
  "Get Healthier",
  "Athletic Performance",
] as const;

/**
 * Date helpers are re-exported from the canonical implementation that the
 * Convex functions use too, so the client and the server can never drift on
 * streak or week-boundary behaviour.
 */
export {
  compareIsoDates,
  computeStreak,
  isIsoDate,
  lastNDates,
  mondayIndexOf,
  shiftDateStr,
  startOfWeek,
  toDateStr,
  todayStr,
} from "../convex/lib/dates";

export function prettyDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function shortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function sumMacros(entries: MealEntry[]) {
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

export function scaleNutrition(
  food: FoodItem,
  quantity: number,
): {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
} {
  return {
    calories: Math.round(food.calories * quantity),
    proteinG: Math.round(food.proteinG * quantity * 10) / 10,
    carbsG: Math.round(food.carbsG * quantity * 10) / 10,
    fatG: Math.round(food.fatG * quantity * 10) / 10,
  };
}

/**
 * Targets derived from a simple Mifflin-St Jeor-style estimate, adjusted for
 * the selected main goal.
 *
 * This is guidance math, not a medical formula. It exists so the user has a
 * legitimate, transparent basis for their calorie and macro targets rather
 * than only typing numbers by hand.
 */
export function torchTargetsFromProfile(input: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: "male" | "female";
  mainGoal: (typeof MAIN_GOALS)[number];
  activity: "sedentary" | "light" | "active" | "veryActive";
}): MacroTargets {
  const mifflin = input.sex === "male"
    ? 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + 5
    : 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age - 161;

  const activityFactor =
    input.activity === "sedentary"
      ? 1.2
      : input.activity === "light"
        ? 1.375
        : input.activity === "active"
          ? 1.55
          : 1.725;

  const tdee = mifflin * activityFactor;
  const deficit = input.mainGoal === "Lose Weight" ? 500 : 0;
  const surplus = input.mainGoal === "Build Muscle" ? 250 : 0;
  const calories = Math.round(Math.max(1200, tdee - deficit + surplus));

  const proteinTargetG = Math.round(
    input.weightKg * (input.mainGoal === "Build Muscle" ? 1.6 : 1.2),
  );
  const fatTargetG = Math.round(input.weightKg * (input.mainGoal === "Build Muscle" ? 1.0 : 0.9));
  const carbsTargetG = Math.round(
    (calories - proteinTargetG * 4 - fatTargetG * 9) / 4,
  );

  return {
    dailyCalorieTarget: calories,
    proteinTargetG,
    carbsTargetG,
    fatTargetG,
  };
}

export function formatQty(q: number): string {
  return Number.isInteger(q) ? String(q) : String(Math.round(q * 10) / 10);
}
