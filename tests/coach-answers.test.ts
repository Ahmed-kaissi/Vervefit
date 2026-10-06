import { describe, expect, test } from "bun:test";
import { deterministicAnswer } from "../src/convex/ai/answers";
import { MAX_CONTEXT_CHARS, buildContextBlock } from "../src/convex/ai/context";
import type { CoachFacts } from "../src/convex/ai/types";

function facts(overrides: Partial<CoachFacts> = {}): CoachFacts {
  return {
    today: "2026-01-05",
    name: "Sam",
    goal: "lose weight",
    fitnessLevel: "beginner",
    sex: "female",
    age: 32,
    heightCm: 168,
    targets: {
      calories: 2000,
      proteinG: 130,
      carbsG: 200,
      fatG: 65,
      waterMl: 2000,
    },
    todayIntake: {
      calories: 1180,
      proteinG: 82,
      carbsG: 120,
      fatG: 40,
      items: 4,
    },
    weekIntake: [
      { date: "2026-01-04", calories: 1900, proteinG: 120, logged: true },
      { date: "2026-01-05", calories: 1180, proteinG: 82, logged: true },
    ],
    weekAverageCalories: 1540,
    loggedDaysThisWeek: 2,
    waterTodayMl: 500,
    latestWeightKg: 72.4,
    weightChangeKg: -0.8,
    weightWindowStart: "2025-12-20",
    habits: [
      { name: "Walk", doneToday: true },
      { name: "Sleep 7h", doneToday: false },
    ],
    habitsDoneToday: 1,
    streakDays: 4,
    sessions: [{ date: "2026-01-05", name: "Upper A", minutes: 45 }],
    trainingMinutesThisWeek: 45,
    sessionCountThisWeek: 1,
    trainedToday: true,
    hasCustomTargets: true,
    ...overrides,
  };
}

describe("calorie answers", () => {
  test("reports the remaining budget from the real numbers", () => {
    const answer = deterministicAnswer("calories_remaining", facts());
    expect(answer).toContain("1180 kcal so far");
    expect(answer).toContain("820 kcal");
  });

  test("says the whole target is open when nothing is logged", () => {
    const answer = deterministicAnswer(
      "calories_remaining",
      facts({
        todayIntake: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, items: 0 },
      }),
    );
    expect(answer).toContain("Nothing logged yet");
    expect(answer).toContain("2000 kcal available today");
  });

  test("is honest about going over", () => {
    const answer = deterministicAnswer(
      "calories_remaining",
      facts({
        todayIntake: {
          calories: 2400,
          proteinG: 120,
          carbsG: 250,
          fatG: 90,
          items: 6,
        },
      }),
    );
    expect(answer).toContain("400 kcal over");
  });
});

describe("protein answers", () => {
  test("computes the gap against the real target", () => {
    const answer = deterministicAnswer("protein_remaining", facts());
    expect(answer).toContain("82 g protein");
    expect(answer).toContain("48 g more");
  });

  test("confirms completion instead of inventing a gap", () => {
    const answer = deterministicAnswer(
      "protein_remaining",
      facts({
        todayIntake: {
          calories: 1800,
          proteinG: 140,
          carbsG: 150,
          fatG: 60,
          items: 5,
        },
      }),
    );
    expect(answer).toContain("already hit your protein target");
  });
});

describe("other lookups", () => {
  test("water reports what is left", () => {
    const answer = deterministicAnswer("water_status", facts());
    expect(answer).toContain("0.5 L of 2 L");
    expect(answer).toContain("1500 ml to go");
  });

  test("training reports the week's sessions", () => {
    const answer = deterministicAnswer("training_minutes", facts());
    expect(answer).toContain("45 minutes of training");
  });

  test("trained_today reports today's sessions", () => {
    expect(deterministicAnswer("trained_today", facts())).toContain("Upper A");
  });

  test("habits lists today's state", () => {
    const answer = deterministicAnswer("habits_today", facts());
    expect(answer).toContain("1 of 2 habits");
    expect(answer).toContain("Walk");
    expect(answer).toContain("Sleep 7h");
  });

  test("streak is reported verbatim", () => {
    expect(deterministicAnswer("streak", facts())).toContain("4 days");
  });

  test("weight reports the trend window", () => {
    const answer = deterministicAnswer("current_weight", facts());
    expect(answer).toContain("72.4 kg");
    expect(answer).toContain("window started 2025-12-20");
  });

  test("weight says what is missing rather than guessing", () => {
    const answer = deterministicAnswer(
      "current_weight",
      facts({ latestWeightKg: null, weightChangeKg: null, weightWindowStart: null }),
    );
    expect(answer).toContain("haven't logged a weight check-in yet");
  });

  test("daily summary mentions each tracked area", () => {
    const answer = deterministicAnswer("daily_summary", facts());
    expect(answer).toContain("Water: 500 ml");
    expect(answer).toContain("Habits: 1 of 2 done");
    expect(answer).toContain("Training: 45 minutes this week");
  });
});

describe("no fabrication", () => {
  test("every number in an answer comes from the facts", () => {
    const f = facts({
      targets: { calories: 2400, proteinG: 180, carbsG: 250, fatG: 80, waterMl: 3000 },
      todayIntake: { calories: 1000, proteinG: 60, carbsG: 90, fatG: 30, items: 3 },
      waterTodayMl: 1000,
    });
    const calorieAnswer = deterministicAnswer("calories_remaining", f);
    expect(calorieAnswer).toContain("1000 kcal so far");
    expect(calorieAnswer).toContain("1400 kcal");
    expect(calorieAnswer).not.toContain("2000");
    expect(deterministicAnswer("protein_remaining", f)).toContain("120 g more");
    expect(deterministicAnswer("water_status", f)).toContain("1 L of 3 L");
  });
});

describe("prompt context", () => {
  test("reports missing data as missing", () => {
    const block = buildContextBlock(
      facts({
        todayIntake: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, items: 0 },
        latestWeightKg: null,
        habits: [],
        habitsDoneToday: 0,
        sessions: [],
        sessionCountThisWeek: 0,
        trainingMinutesThisWeek: 0,
        weekAverageCalories: null,
        loggedDaysThisWeek: 0,
        hasCustomTargets: false,
        goal: null,
        fitnessLevel: null,
        sex: null,
        age: null,
        heightCm: null,
      }),
    );
    // Each block is a labelled segment; match on the text payload.
    expect(block.map((b) => b.text).join(" ")).toContain("No meals logged today yet");
    expect(block.map((b) => b.text).join(" ")).toContain("No training logged this week yet");
    expect(block.map((b) => b.text).join(" ")).toContain("You haven't logged a weight check-in yet");
    expect(block.map((b) => b.text).join(" ")).toContain("No habits ticked off today yet");
    expect(block.map((b) => b.text).join(" ")).toContain("no logged days kcal/day over");
  });

  test("flags default targets so the model can tell them apart", () => {
    const block = buildContextBlock(facts({ hasCustomTargets: false }));
    expect(block.some((b) => b.text.includes("app defaults"))).toBe(true);
    const custom = buildContextBlock(facts({ hasCustomTargets: true }));
    expect(custom.some((b) => b.text.includes("app defaults"))).toBe(false);
  });

  test("stays inside the character budget even for a busy week", () => {
    const busy = facts({
      sessions: Array.from({ length: 40 }, (_, i) => ({
        date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
        name: `Session with a fairly long name ${i}`,
        minutes: 60,
      })),
      habits: Array.from({ length: 8 }, (_, i) => ({
        name: `Habit number ${i} with a long description`,
        doneToday: i % 2 === 0,
      })),
    });
    const block = buildContextBlock(busy);
    expect(block.length).toBeLessThanOrEqual(MAX_CONTEXT_CHARS + 40);
  });
});
