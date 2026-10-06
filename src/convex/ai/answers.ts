import type { CoachFacts } from "./types";

/**
 * The deterministic answer layer.
 *
 * These answers are pure functions of a user's own logged data, so they are
 * fast, free, and never need an API call. The AI server calls them first for
 * "lightweight" questions and only asks a provider when a question needs real
 * reasoning.
 */
export type DeterministicIntent =
  | "calories_remaining"
  | "protein_remaining"
  | "water_status"
  | "training_minutes"
  | "trained_today"
  | "habits_today"
  | "streak"
  | "current_weight"
  | "daily_summary"
  | "goal_check";

/** Maximum number of log rows to look at per bucket so reads stay bounded. */
const BUCKET_LIMIT = 400;

export function deterministicAnswer(intent: DeterministicIntent, facts: CoachFacts): string {
  switch (intent) {
    case "calories_remaining": {
      const intake = facts.todayIntake.calories;
      const target = facts.targets.calories;
      const diff = target - intake;
      if (intake === 0) return "Nothing logged yet — you have " + target + " kcal available today.";
      if (diff > 0) return "You've used " + intake + " kcal so far. You can still eat " + diff + " kcal.";
      return "You're " + (-diff) + " kcal over your target today.";
    }
    case "protein_remaining": {
      const intake = facts.todayIntake.proteinG;
      const target = facts.targets.proteinG;
      const diff = target - intake;
      if (intake === 0) return "No protein logged yet — target is " + target + " g today.";
      if (diff > 0) return "You've had " + intake + " g protein. You need " + diff + " g more.";
      return "You've already hit your protein target — keep it up.";
    }
    case "water_status": {
      const intake = facts.waterTodayMl;
      const target = facts.targets.waterMl;
      if (intake === 0) return "No water logged today. You need " + target + " ml.";
      const left = target - intake;
      return left >= 0 ? "So far: " + intake / 1000 + " L of " + target / 1000 + " L. " + left + " ml to go."
        : "You've already drunk " + intake / 1000 + " L — that's " + (-left) + " ml over target.";
    }
    case "training_minutes": {
      const minutes = facts.trainingMinutesThisWeek;
      return minutes === 0 ? "No training this week yet. Which day would you like to plan?"
        : "This week you've done " + minutes + " minutes of training.";
    }
    case "trained_today": {
      if (!facts.trainedToday) return "Nothing logged for today — tell me what you did.";
      const today = facts.sessions.find((s) => s.date === facts.today);
      return today ? `You trained "${today.name}" today for ${today.minutes} minutes.` : "Nothing logged for today.";
    }
    case "habits_today": {
      if (facts.habitsDoneToday === 0) return "No habits ticked off today yet.";
      const lines = facts.habits.map((h) =>
        h.doneToday ? `✓ ${h.name}` : `○ ${h.name}`,
      );
      return (
        "Today you've done " + facts.habitsDoneToday + " of " + facts.habits.length +
        " habits: " + lines.join(", ") + "."
      );
    }
    case "streak": {
      const streak = facts.streakDays;
      return streak === 0 ? "No streak yet — start a habit today and you'll build one."
        : "You've kept your streak going for " + streak + " days.";
    }
    case "current_weight": {
      const weight = facts.latestWeightKg;
      if (weight == null) return "You haven't logged a weight check-in yet.";
      const windowStart = facts.weightWindowStart ?? "today";
      return `${weight} kg as of ${facts.latestWeightKg == null ? "today" : "the latest check-in"} — window started ${windowStart}.`;
    }
    case "daily_summary": {
      const lines = [
        "Meals: " + facts.todayIntake.calories + " kcal, " + facts.todayIntake.proteinG + " g protein.",
        "Water: " + facts.waterTodayMl + " ml.",
        "Habits: " + facts.habitsDoneToday + " of " + facts.habits.length + " done.",
        "Training: " + facts.trainingMinutesThisWeek + " minutes this week.",
      ];
      return lines.join(" ");
    }
    case "goal_check": {
      const goal = facts.goal ?? "the goal you set";
      return `You've set your goal as "${goal}". Want me to compare your latest measurements against it?`;
    }
    default: {
      const _exhaustive: never = intent;
      return "I can answer that straight from your log. Ask about calories, protein, water, meals, training or your goals.";
    }
  }
}
