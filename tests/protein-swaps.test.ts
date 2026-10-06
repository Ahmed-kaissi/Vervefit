import { describe, expect, test } from "bun:test";
import { FOOD_DATABASE } from "../src/lib/food-database";
import { proteinDensity, suggestProteinSwaps } from "../src/lib/protein-swaps";
import type { FoodItem } from "../src/lib/nutrition";

const chicken: FoodItem = {
  name: "Chicken Breast, Grilled",
  category: "Protein",
  servingSize: 100,
  servingUnit: "g",
  calories: 165,
  proteinG: 31,
  carbsG: 0,
  fatG: 3.6,
};

const oil: FoodItem = {
  name: "Olive Oil",
  category: "Fats",
  servingSize: 1,
  servingUnit: "tbsp",
  calories: 119,
  proteinG: 0,
  carbsG: 0,
  fatG: 13.5,
};

const toast: FoodItem = {
  name: "White Bread",
  category: "Grains",
  servingSize: 1,
  servingUnit: "slice",
  calories: 80,
  proteinG: 2.7,
  carbsG: 14,
  fatG: 1,
};

describe("protein density", () => {
  test("is grams of protein per 100 kcal", () => {
    expect(Math.round(proteinDensity(chicken))).toBe(19);
  });

  test("is zero for foods with no calories rather than Infinity", () => {
    expect(proteinDensity({ ...chicken, calories: 0 })).toBe(0);
  });
});

describe("suggestions", () => {
  test("returns nothing when the protein target is already met", () => {
    expect(
      suggestProteinSwaps({
        proteinRemainingG: 0,
        caloriesRemaining: 800,
        foods: [chicken],
      }),
    ).toEqual([]);
  });

  test("sizes the portion to close the remaining gap", () => {
    const [swap] = suggestProteinSwaps({
      proteinRemainingG: 31,
      caloriesRemaining: 1000,
      foods: [chicken],
    });
    expect(swap.servings).toBe(1);
    expect(swap.proteinG).toBe(31);
    expect(swap.calories).toBe(165);
    expect(swap.coverage).toBeCloseTo(1, 5);
  });

  test("never exceeds the calories the user has left", () => {
    const swaps = suggestProteinSwaps({
      proteinRemainingG: 120,
      caloriesRemaining: 200,
      foods: [chicken],
    });
    const [swap] = swaps;
    expect(swap).toBeDefined();
    expect(swap.calories).toBeLessThanOrEqual(200);
    expect(swap.servings).toBeLessThan(1.5);
  });

  test("scales protein and calories together with the serving count", () => {
    const [swap] = suggestProteinSwaps({
      proteinRemainingG: 62,
      caloriesRemaining: 1000,
      foods: [chicken],
    });
    expect(swap.servings).toBe(2);
    expect(swap.proteinG).toBe(62);
    expect(swap.calories).toBe(330);
  });

  test("rejects low-protein and low-density foods", () => {
    const swaps = suggestProteinSwaps({
      proteinRemainingG: 40,
      caloriesRemaining: 1200,
      foods: [oil, toast],
    });
    expect(swaps).toEqual([]);
  });

  test("ranks high protein-per-calorie foods first", () => {
    const lean: FoodItem = {
      ...chicken,
      name: "Turkey Breast",
      calories: 135,
      proteinG: 30,
    };
    const swaps = suggestProteinSwaps({
      proteinRemainingG: 45,
      caloriesRemaining: 900,
      foods: [chicken, lean],
    });
    expect(swaps[0].food.name).toBe("Turkey Breast");
  });

  test("honours the limit", () => {
    const swaps = suggestProteinSwaps({
      proteinRemainingG: 60,
      caloriesRemaining: 2000,
      foods: FOOD_DATABASE,
      limit: 2,
    });
    expect(swaps.length).toBeLessThanOrEqual(2);
  });

  test("every number it reports comes from the food it was given", () => {
    const swaps = suggestProteinSwaps({
      proteinRemainingG: 50,
      caloriesRemaining: 900,
      foods: FOOD_DATABASE,
      limit: 3,
    });
    expect(swaps.length).toBeGreaterThan(0);
    for (const swap of swaps) {
      expect(swap.proteinG).toBe(Math.round(swap.food.proteinG * swap.servings));
      expect(swap.calories).toBe(Math.round(swap.food.calories * swap.servings));
      expect(swap.calories).toBeLessThanOrEqual(900);
    }
  });

  test("an infinite budget is handled without producing absurd portions", () => {
    const swaps = suggestProteinSwaps({
      proteinRemainingG: 30,
      caloriesRemaining: Number.POSITIVE_INFINITY,
      foods: [chicken],
    });
    expect(swaps[0].servings).toBeLessThanOrEqual(4);
  });

  test("explains the suggestion in plain language", () => {
    const [swap] = suggestProteinSwaps({
      proteinRemainingG: 31,
      caloriesRemaining: 1000,
      foods: [chicken],
    });
    expect(swap.reason).toContain("protein");
    expect(swap.reason).toContain("kcal");
  });

  test("the real food database yields usable suggestions", () => {
    const swaps = suggestProteinSwaps({
      proteinRemainingG: 42,
      caloriesRemaining: 600,
      foods: FOOD_DATABASE,
    });
    expect(swaps.length).toBeGreaterThan(0);
  });
});
