import type { CoachFacts } from "./types";

/** How many characters of context to keep, so long log histories stay bounded. */
export const MAX_CONTEXT_CHARS = 1200;

/** One block of coach context, split into labelled segments. */
export interface CoachContextBlock {
  label: string;
  text: string;
}

/**
 * Build the context block that goes in front of the AI's system prompt.
 *
 * Every read is bounded: a fixed date window, hardcoded limits, and `.take(n)`
 * so a user's log grows without limit it can never stream the whole database.
 */
export function buildContextBlock(facts: CoachFacts): CoachContextBlock[] {
  const out: CoachContextBlock[] = [];
  const today = facts.today;
  const name = facts.name ?? "there";
  const goal = facts.goal ?? "your stated goal";
  const weight = facts.latestWeightKg != null ? `${facts.latestWeightKg} kg` : null;

  out.push({
    label: "Your profile",
    text: `You are helping ${name}, a ${facts.fitnessLevel ?? "beginner"} ${facts.sex ?? ""} who is ${facts.age ?? ""} years old, ${facts.heightCm ?? ""} cm tall, aiming to ${goal}.`,
  });

  out.push({
    label: "Your goals",
    text: `Daily targets: ${facts.targets.calories} kcal, ${facts.targets.proteinG} g protein, ${facts.targets.carbsG} g carbs, ${facts.targets.fatG} g fat, ${facts.targets.waterMl} ml water` +
      (facts.hasCustomTargets ? " (custom)" : " (app defaults)") + ".",
  });

  out.push({
    label: "Today's meals",
    text: facts.todayIntake.items === 0
      ? "No meals logged today yet."
      : `You have logged ${facts.todayIntake.items} items totalling ${facts.todayIntake.calories} kcal, ${facts.todayIntake.proteinG} g protein, ${facts.todayIntake.carbsG} g carbs, ${facts.todayIntake.fatG} g fat.`,
  });

  out.push({
    label: "This week's training",
    text: facts.sessionCountThisWeek === 0
      ? "No training logged this week yet."
      : `${facts.trainingMinutesThisWeek} minutes across ${facts.sessionCountThisWeek} session(s) this week.`,
  });

  out.push({
    label: "Today's weight",
    text: weight ?? "You haven't logged a weight check-in yet.",
  });

  out.push({
    label: "Today's habits",
    text: facts.habitsDoneToday === 0
      ? "No habits ticked off today yet."
      : `${facts.habitsDoneToday} of ${facts.habits.length} habits done today.`,
  });

  out.push({
    label: "Your week",
    text: `Averaged ${facts.weekAverageCalories ?? "no logged days"} kcal/day over the last ${facts.loggedDaysThisWeek} logged day(s) this week.`,
  });

  return out;
}

/** A single system prompt built from a context block. */
export function buildSystemPrompt(block: CoachContextBlock): string {
  const segments = block.text
    .split("\n")
    .map((line) => (line.trim() ? `- ${line.trim()}` : ""))
    .filter(Boolean);
  return [
    "You are the VerveFit coach, a practical nutrition and training coach. Answer from the user's own data and keep it short and factual.",
    "",
    "Rules:",
    "1. Only use the facts you are given — never invent a number, weight, meal, or workout.",
    "2. If a fact is missing, say you don't have it instead of guessing.",
    "3. Keep the answer short (under 600 tokens) and easy to read on a phone.",
    "4. Prefer numbers you can show: " + segments.map((s) => s.replace(/^- /, "")).join(", ") + ".",
    "5. If the user asks to change their plan or set a new goal, ask them to open the goals screen and confirm before you promise anything.",
  ].join("\n");
}
