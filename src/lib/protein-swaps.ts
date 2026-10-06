import type { FoodItem } from "./nutrition";

/**
 * "I still need 42 g of protein" — answered with real foods from the food
 * database, sized to the calories the user actually has left.
 *
 * Pure and deterministic: same inputs, same suggestions, no network and no
 * model. Nothing here invents nutrition values; every number comes from the
 * `FoodItem` it was given.
 */

/** Below this a food is not a protein solution, it is a snack. */
const MIN_PROTEIN_PER_SERVING_G = 8;
/** Grams of protein per 100 kcal. Egg whites ≈ 21, olive oil ≈ 0. */
const MIN_PROTEIN_DENSITY = 8;
/** Never suggest more than this many servings of one thing. */
const MAX_SERVINGS = 4;
/** Ignore candidates that close less than this share of the gap. */
const MIN_GAP_COVERAGE = 0.2;

export interface ProteinSwap {
  food: FoodItem;
  /** How much of it to eat, in servings. */
  servings: number;
  /** Protein delivered by that serving count, rounded. */
  proteinG: number;
  /** Calories that serving count costs, rounded. */
  calories: number;
  /** Share of the remaining protein gap this closes, 0–1. */
  coverage: number;
  /** Short, factual sentence for the UI. */
  reason: string;
}

export interface ProteinSwapInput {
  /** Protein still needed today, in grams. */
  proteinRemainingG: number;
  /** Calories still available today. May be negative when over target. */
  caloriesRemaining: number;
  foods: FoodItem[];
  limit?: number;
}

export function proteinDensity(food: FoodItem): number {
  if (food.calories <= 0) return 0;
  return (food.proteinG / food.calories) * 100;
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatServings(servings: number): string {
  return Number.isInteger(servings) ? String(servings) : servings.toFixed(1);
}

export function suggestProteinSwaps(input: ProteinSwapInput): ProteinSwap[] {
  const remaining = Math.max(0, input.proteinRemainingG);
  if (remaining <= 0) return [];

  // A negative calorie balance still allows suggestions, it just means the
  // user has already overshot — don't offer a huge portion on top of that.
  const budget = Number.isFinite(input.caloriesRemaining)
    ? Math.max(0, input.caloriesRemaining)
    : Number.POSITIVE_INFINITY;

  const suggestions: ProteinSwap[] = [];

  for (const food of input.foods) {
    if (food.proteinG < MIN_PROTEIN_PER_SERVING_G) continue;
    if (food.calories <= 0) continue;
    if (proteinDensity(food) < MIN_PROTEIN_DENSITY) continue;

    const servingsForGap = remaining / food.proteinG;
    const servingsForBudget = budget / food.calories;
    // Round the portion once, then derive every number from that rounded
    // value, so what the UI shows is exactly what gets logged.
    const servings = Math.max(
      0.5,
      round(Math.min(MAX_SERVINGS, servingsForGap, servingsForBudget), 1),
    );

    const proteinG = food.proteinG * servings;
    const calories = food.calories * servings;
    const coverage = proteinG / remaining;

    if (coverage < MIN_GAP_COVERAGE) continue;
    if (budget !== Number.POSITIVE_INFINITY && calories > budget + 1) continue;

    suggestions.push({
      food,
      servings,
      proteinG: Math.round(proteinG),
      calories: Math.round(calories),
      coverage,
      reason: `${formatServings(servings)} × ${
        food.servingLabel ?? `${food.servingSize} ${food.servingUnit}`
      } adds ${Math.round(proteinG)} g protein for ${Math.round(calories)} kcal.`,
    });
  }

  // Best protein-per-calorie first, then whatever closes the most of the gap.
  return suggestions
    .sort((a, b) => {
      const scoreA = proteinDensity(a.food) + 40 * a.coverage;
      const scoreB = proteinDensity(b.food) + 40 * b.coverage;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.food.name.localeCompare(b.food.name);
    })
    .slice(0, input.limit ?? 3);
}
