import type { CoachProviderId } from "../../lib/coach-core";
import { readProviderRegistry } from "./provider";

/** Which layer a question belongs to. */
export type QuestionLayer = "lightweight" | "reasoning";

/** Deterministic layer is free and needs no prompt engineering. */
export const LAYERS: Array<{ id: CoachProviderId; label: string; kind: QuestionLayer }> = [
  { id: "deterministic", label: "Calculated from your log", kind: "lightweight" },
  { id: "free", label: "Fast model", kind: "lightweight" },
  { id: "deepseek", label: "DeepSeek", kind: "reasoning" },
];

/**
 * Pick the provider the UI should ask, using a defensive chain:
 *
 *  - "lightweight" questions start with the free model and drop to DeepSeek
 *    only if the free model refuses.
 *  - "reasoning" questions start with DeepSeek and fall back to the free model.
 *  - never repeats a provider.
 */
export function buildChain(
  layer: QuestionLayer,
  registry: ReturnType<typeof readProviderRegistry>,
): Array<any> {
  const out: Array<any> = [];
  if (!registry) return out;
  const { free, deepseek } = registry;
  if (layer === "reasoning") {
    if (deepseek) out.push(deepseek);
    if (free) out.push(free);
    return out;
  }
  if (free) out.push(free);
  if (deepseek) out.push(deepseek);
  return out;
}

/** Order a chain by preference (cheapest first). */
export function orderChain(chain: Array<{ config: any; weight: number }>): Array<{ config: any; weight: number }> {
  return [...chain].sort((a, b) => a.weight - b.weight);
}

/**
 * Rank a question:
 *
 *  1. Deterministic lookups are free and never need a model.
 *  2. Reasoning questions go to DeepSeek.
 *  3. Everything else is lightweight.
 */
export function classifyCoachQuestion(question: string): {
  route: "deterministic" | "lightweight" | "reasoning";
  intent: string | null;
  reason: string;
} {
  const trimmed = question.trim();
  if (!trimmed) return { route: "lightweight", intent: null, reason: "empty" };

  // Normalize for case-insensitive matching.
  const q = trimmed.toLowerCase();

  // Lookups resolve to a deterministic intent from a closed vocabulary.
  const lookup: Array<[RegExp, string]> = [
    [/how\s+many\s+(?:calories|kcal|calorie).*(?:left|remaining|leftover)/, "calories_remaining"],
    [/what's?\s+my\s+calorie\s+target/, "calorie_target"],
    [/how\s+much\s+protein.*(?:left|remaining|need today)/, "protein_remaining"],
    [/how\s+many\s+macros.*(?:left|remaining)/, "macros_remaining"],
    [/how\s+much\s+water.*(?:drunk|consumed)/, "water_status"],
    [/how\s+many\s+workout\s+minutes.*(?:complete|do)/, "training_minutes"],
    [/did\s+i\s+train\s+today\?/, "trained_today"],
    [/how\s+many\s+habits.*(?:complete|done)/, "habits_today"],
    [/what('s| is)?\s+my\s+streak/, "streak"],
    [/what('s| is)?\s+my\s+current\s+weight/, "current_weight"],
    [/how\s+many\s+calories.*(?:eaten|consumed|today)/, "calories_eaten"],
    [/how\s+am\s+i\s+(?:doing|feeling).*today\?/, "daily_summary"],
  ];
  for (const [regex, intent] of lookup) {
    if (regex.test(q)) {
      return { route: "deterministic", intent, reason: "intent:" + intent };
    }
  }

  // Reasoning requests are analysis, comparison, explanation, planning,
  // or helping someone break through a plateau.
  if (
    /analyze|compare|correlation|trend|why\s+(?:do|am|i|is|are|was|were|does|did)/.test(q) ||
    /help\s+me\s+(?:design|plan|create|build|prepare|break\s+through)/.test(q) ||
    /plan\s+my\s+(?:protein|meals|routine|week|day|training)/.test(q) ||
    /break\s+through|plateau|stuck/i.test(q) ||
    /how\s+do\s+i\s+lose\s+weight/.test(q)
  ) {
    return { route: "reasoning", intent: null, reason: "reasoning" };
  }

  // Long or stacked questions go to the reasoning model.
  if (q.length > 160) return { route: "reasoning", intent: null, reason: "long-message" };
  const questionCount = (q.match(/\?/g) || []).length;
  if (questionCount > 1) return { route: "reasoning", intent: null, reason: "multi-question" };

  return { route: "lightweight", intent: null, reason: "open" };
}

/** True for questions that ask for analysis, comparison, or planning. */
export function hasReasoningSignal(question: string): boolean {
  const t = question.trim().toLowerCase();
  if (!t) return false;
  return (
    /analyze|compare|correlation|trend|correlation|why\s+(?:do|am|i|is|are|was|were|does|did)/.test(t) ||
    /help\s+me\s+(?:design|plan|create|build|prepare)/.test(t) ||
    /plan\s+my\s+(?:protein|meals|routine|week|day|training)/.test(t) ||
    /break\s+through|plateau|stuck/.test(t) ||
    /how\s+(?:do|i)\s+lose\s+weight/.test(t)
  );
}

/** Resolve a deterministic intent from a coach question. Returns null if open. */
export function matchDeterministicIntent(question: string): string | null {
  const q = question.trim().toLowerCase();
  if (!q) return null;
  const lookups: Array<[RegExp, string]> = [
    [/calories_remaining/i, "calories_remaining"],
    [/calorie\s+target/i, "calorie_target"],
    [/protein_remaining/i, "protein_remaining"],
    [/macros_remaining/i, "macros_remaining"],
    [/water_status/i, "water_status"],
    [/training_minutes/i, "training_minutes"],
    [/trained_today/i, "trained_today"],
    [/habits_today/i, "habits_today"],
    [/streak/i, "streak"],
    [/current_weight/i, "current_weight"],
    [/calories_eaten/i, "calories_eaten"],
    [/daily_summary/i, "daily_summary"],
  ];
  for (const [regex, intent] of lookups) {
    if (regex.test(q)) return intent;
  }
  return null;
}

/**
 * Apply a user tier override atop the router's decision.
 *
 *  - "auto" keeps the router's decision.
 *  - "fast" forces the lightweight layer, EXCEPT for "deterministic" lookups,
 *    which stay deterministic because no model is billed for arithmetic.
 *  - "deep" forces the reasoning layer, except deterministic lookups stay
 *    deterministic.
 */
export function applyTier(layer: string, tier: string | null | undefined): string {
  if (!tier) return layer;
  const t = tier.toLowerCase();
  if (t === "auto") return layer;
  if (t === "fast") return layer === "deterministic" ? "deterministic" : "lightweight";
  if (t === "deep") return layer === "deterministic" ? "deterministic" : "reasoning";
  return layer;
}
