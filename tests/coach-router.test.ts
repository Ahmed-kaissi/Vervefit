import { describe, expect, test } from "bun:test";
import {
  applyTier,
  classifyCoachQuestion,
  hasReasoningSignal,
  matchDeterministicIntent,
} from "../src/convex/ai/router";

describe("deterministic lookups", () => {
  const cases: Array<[string, string]> = [
    ["How many calories do I have left?", "calories_remaining"],
    ["how many kcal remaining", "calories_remaining"],
    ["What's my calorie target?", "calorie_target"],
    ["How much protein do I need today?", "protein_remaining"],
    ["how much protein is remaining?", "protein_remaining"],
    ["How many macros are left?", "macros_remaining"],
    ["How much water have I drunk?", "water_status"],
    ["How many workout minutes did I complete?", "training_minutes"],
    ["Did I train today?", "trained_today"],
    ["How many habits did I complete?", "habits_today"],
    ["What is my streak?", "streak"],
    ["What is my current weight?", "current_weight"],
    ["How many calories have I eaten?", "calories_eaten"],
    ["How am I doing today?", "daily_summary"],
  ];

  for (const [question, intent] of cases) {
    test(`"${question}" -> ${intent}`, () => {
      const decision = classifyCoachQuestion(question);
      expect(decision.route).toBe("deterministic");
      expect(decision.intent).toBe(intent);
    });
  }

  test("lookups never need a model", () => {
    expect(classifyCoachQuestion("How many calories do I have left?").reason).toBe(
      "intent:calories_remaining",
    );
  });
});

describe("reasoning questions", () => {
  const reasoning = [
    "Analyze my last month of training vs nutrition and tell me what to change",
    "Why am I always hungry at night?",
    "Can you plan my protein for the next week?",
    "Compare my weeks and explain the trend",
    "I'm stuck on a plateau, help me break through",
    "Help me design a routine around 3 days a week",
    "How do I lose weight without losing strength?",
  ];

  for (const question of reasoning) {
    test(`"${question}" -> reasoning`, () => {
      expect(classifyCoachQuestion(question).route).toBe("reasoning");
    });
  }

  test("a long message goes to the reasoning model", () => {
    const long = `I have been training for a while and ${"a".repeat(280)}`;
    expect(classifyCoachQuestion(long).route).toBe("reasoning");
    expect(classifyCoachQuestion(long).reason).toBe("long-message");
  });

  test("stacked questions go to the reasoning model", () => {
    const stacked = "What should I eat? Should I train?";
    const decision = classifyCoachQuestion(stacked);
    expect(decision.route).toBe("reasoning");
    expect(decision.reason).toBe("multi-question");
  });
});

describe("lightweight questions", () => {
  const lightweight = [
    "What should I eat for dinner?",
    "Give me a quick snack idea",
    "Should I train today?",
    "Any tips for staying on track?",
  ];

  for (const question of lightweight) {
    test(`"${question}" -> lightweight`, () => {
      const decision = classifyCoachQuestion(question);
      expect(decision.route).toBe("lightweight");
      expect(decision.intent).toBeNull();
    });
  }

  test("an empty message defaults to the lightweight layer", () => {
    expect(classifyCoachQuestion("   ").route).toBe("lightweight");
  });
});

describe("classification helpers", () => {
  test("a lookup phrase inside an analysis question stays analysis", () => {
    expect(hasReasoningSignal("Why are my calories left over every night?")).toBe(
      true,
    );
    expect(classifyCoachQuestion("Why are my calories left over every night?").route).toBe(
      "reasoning",
    );
  });

  test("matchDeterministicIntent is null for open questions", () => {
    expect(matchDeterministicIntent("What should I cook tonight?")).toBeNull();
  });
});

describe("tier overrides", () => {
  test("auto keeps the router's decision", () => {
    expect(applyTier("lightweight", "auto")).toBe("lightweight");
    expect(applyTier("reasoning", "auto")).toBe("reasoning");
  });

  test("fast forces the lightweight layer", () => {
    expect(applyTier("reasoning", "fast")).toBe("lightweight");
  });

  test("deep forces the reasoning layer", () => {
    expect(applyTier("lightweight", "deep")).toBe("reasoning");
  });

  test("a lookup stays deterministic on every tier: no model is billed for arithmetic", () => {
    expect(applyTier("deterministic", "auto")).toBe("deterministic");
    expect(applyTier("deterministic", "fast")).toBe("deterministic");
    expect(applyTier("deterministic", "deep")).toBe("deterministic");
  });
});
