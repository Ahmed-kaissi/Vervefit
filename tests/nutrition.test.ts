import { describe, expect, test } from "bun:test";
import {
  DEFAULT_TARGETS,
  MEAL_ORDER,
  formatQty,
  scaleNutrition,
  sumMacros,
  type MealEntry,
} from "../src/lib/nutrition";
import { totalsOf } from "../src/hooks/use-food-log";

function entry(overrides: Partial<MealEntry> = {}): MealEntry {
  return {
    id: "e1",
    date: "2026-01-05",
    mealType: "breakfast",
    quantity: 1,
    loggedAt: 0,
    name: "Oats",
    category: "Grains",
    servingSize: 40,
    servingUnit: "g",
    calories: 150,
    proteinG: 5,
    carbsG: 27,
    fatG: 3,
    ...overrides,
  };
}

describe("totals", () => {
  test("sums an empty log to zero", () => {
    expect(sumMacros([])).toEqual({
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
  });

  test("sums every macro across entries", () => {
    const totals = sumMacros([
      entry(),
      entry({ id: "e2", calories: 200, proteinG: 30, carbsG: 10, fatG: 5 }),
    ]);
    expect(totals).toEqual({
      calories: 350,
      proteinG: 35,
      carbsG: 37,
      fatG: 8,
    });
  });

  test("the hook's totals helper agrees with the library helper", () => {
    const entries = [entry(), entry({ id: "e2", calories: 90 })];
    expect(totalsOf(entries)).toEqual(sumMacros(entries));
  });
});

describe("scaling", () => {
  test("scales every macro by quantity", () => {
    const scaled = scaleNutrition(
      {
        name: "Rice",
        category: "Grains",
        servingSize: 100,
        servingUnit: "g",
        calories: 130,
        proteinG: 2.7,
        carbsG: 28,
        fatG: 0.3,
      },
      1.5,
    );
    expect(scaled.calories).toBe(195);
    expect(scaled.proteinG).toBe(4.1);
    expect(scaled.carbsG).toBe(42);
    expect(scaled.fatG).toBe(0.5);
  });

  test("a zero quantity scales to zero rather than NaN", () => {
    const scaled = scaleNutrition(
      {
        name: "Rice",
        category: "Grains",
        servingSize: 100,
        servingUnit: "g",
        calories: 130,
        proteinG: 2.7,
        carbsG: 28,
        fatG: 0.3,
      },
      0,
    );
    expect(scaled.calories).toBe(0);
    expect(Number.isNaN(scaled.proteinG)).toBe(false);
  });
});

describe("formatting", () => {
  test("prints whole numbers without a decimal", () => {
    expect(formatQty(2)).toBe("2");
  });

  test("prints halves with one decimal", () => {
    expect(formatQty(1.5)).toBe("1.5");
  });
});

describe("defaults", () => {
  test("the default targets are internally consistent", () => {
    // 4 kcal/g protein and carbs, 9 kcal/g fat — within rounding of the target.
    const computed =
      DEFAULT_TARGETS.proteinTargetG * 4 +
      DEFAULT_TARGETS.carbsTargetG * 4 +
      DEFAULT_TARGETS.fatTargetG * 9;
    expect(Math.abs(computed - DEFAULT_TARGETS.dailyCalorieTarget)).toBeLessThan(
      60,
    );
  });

  test("meal order covers every meal type exactly once", () => {
    expect([...MEAL_ORDER].sort()).toEqual(
      ["breakfast", "dinner", "lunch", "snack"].sort(),
    );
  });
});
