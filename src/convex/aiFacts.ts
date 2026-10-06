import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import { computeStreak, lastNDates, shiftDateStr, todayStr } from "./lib/dates";
import type {
  CoachDayIntake,
  CoachFacts,
  CoachHabitSummary,
  CoachSessionSummary,
} from "./ai/types";

/**
 * The single source of coach context.
 *
 * Every read below is bounded: a fixed date window plus `.take(n)`. The old
 * implementation `.collect()`ed whole tables (every habit log, every weight,
 * every session, the entire transcript) and trimmed in memory, which grew
 * without limit as an account aged.
 */

const WEEK_DAYS = 7;
const WEIGHT_WINDOW_DAYS = 120;
const STREAK_WINDOW_DAYS = 90;

const LIMITS = {
  mealEntries: 400,
  waterRows: 20,
  weightRows: 120,
  habits: 20,
  habitLogs: 600,
  sessions: 60,
};

const DEFAULTS = {
  calories: 2000,
  proteinG: 150,
  carbsG: 200,
  fatG: 65,
  waterMl: 2000,
};

const GOAL_LABELS: Record<string, string> = {
  lose: "lose fat",
  cut: "cut",
  "lose-weight": "lose weight",
  "lose weight": "lose weight",
  maintain: "maintain weight",
  gain: "build muscle",
  "build-muscle": "build muscle",
  "build muscle": "build muscle",
  recomp: "recomp",
  "improve-endurance": "improve endurance",
  "improve endurance": "improve endurance",
  "get healthier": "get healthier",
  "athletic performance": "athletic performance",
};

export const snapshot = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }): Promise<CoachFacts> => {
    const today = todayStr();
    const weekAgo = shiftDateStr(today, -(WEEK_DAYS - 1));
    const weightWindowStart = shiftDateStr(today, -(WEIGHT_WINDOW_DAYS - 1));
    const streakWindowStart = shiftDateStr(today, -(STREAK_WINDOW_DAYS - 1));

    const user = await ctx.db.get(userId);

    const [mealRows, waterRows, weightRows, habitRows, habitLogRows, sessionRows] =
      await Promise.all([
        ctx.db
          .query("mealEntries")
          .withIndex("by_user_day", (q) =>
            q.eq("userId", userId).gte("date", weekAgo),
          )
          .take(LIMITS.mealEntries),
        ctx.db
          .query("waterLogs")
          .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("date", today))
          .take(LIMITS.waterRows),
        ctx.db
          .query("weightLogs")
          .withIndex("by_user_day", (q) =>
            q.eq("userId", userId).gte("date", weightWindowStart),
          )
          .take(LIMITS.weightRows),
        ctx.db
          .query("habits")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(LIMITS.habits),
        ctx.db
          .query("habitLogs")
          .withIndex("by_user_day", (q) =>
            q.eq("userId", userId).gte("date", streakWindowStart),
          )
          .take(LIMITS.habitLogs),
        ctx.db
          .query("workoutSessions")
          .withIndex("by_user_day", (q) =>
            q.eq("userId", userId).gte("date", weekAgo),
          )
          .take(LIMITS.sessions),
      ]);

    const days = lastNDates(WEEK_DAYS, today);
    const perDay = new Map<string, CoachDayIntake>();
    for (const d of days) {
      perDay.set(d, { date: d, calories: 0, proteinG: 0, logged: false });
    }

    let todayCalories = 0;
    let todayProtein = 0;
    let todayCarbs = 0;
    let todayFat = 0;
    let todayItems = 0;

    for (const row of mealRows) {
      const bucket = perDay.get(row.date);
      if (bucket) {
        bucket.calories += row.calories;
        bucket.proteinG += row.proteinG;
        bucket.logged = true;
      }
      if (row.date === today) {
        todayCalories += row.calories;
        todayProtein += row.proteinG;
        todayCarbs += row.carbsG;
        todayFat += row.fatG;
        todayItems += 1;
      }
    }

    const weekIntake = days.map((d) => perDay.get(d)!);
    const loggedDays = weekIntake.filter((d) => d.logged);
    const weekAverageCalories =
      loggedDays.length > 0
        ? Math.round(
            loggedDays.reduce((a, d) => a + d.calories, 0) / loggedDays.length,
          )
        : null;

    const waterTodayMl = waterRows.reduce((a, r) => a + r.ml, 0);

    const sortedWeights = [...weightRows].sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
    );
    const latest = sortedWeights[sortedWeights.length - 1];
    const earliest = sortedWeights[0];

    const habitLogDates = new Set(habitLogRows.map((l) => l.date));
    const doneToday = new Set(
      habitLogRows.filter((l) => l.date === today).map((l) => l.habitId),
    );
    const activeHabits = habitRows.filter((h) => !h.archived);
    const habits: CoachHabitSummary[] = activeHabits
      .slice(0, 8)
      .map((h) => ({ name: h.name, doneToday: doneToday.has(h._id) }));

    const sessions: CoachSessionSummary[] = [...sessionRows]
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .map((s) => ({ date: s.date, name: s.name, minutes: s.minutes }));

    const hasCustomTargets = typeof user?.dailyCalorieTarget === "number";

    return {
      today,
      name: user?.name ?? null,
      goal: user?.mainGoal ? GOAL_LABELS[user.mainGoal.toLowerCase()] ?? user.mainGoal : null,
      fitnessLevel: user?.fitnessLevel ?? null,
      sex: user?.sex ?? null,
      age: user?.age ?? null,
      heightCm: user?.heightCm ?? null,
      targets: {
        calories: user?.dailyCalorieTarget ?? DEFAULTS.calories,
        proteinG: user?.proteinTargetG ?? DEFAULTS.proteinG,
        carbsG: user?.carbsTargetG ?? DEFAULTS.carbsG,
        fatG: user?.fatTargetG ?? DEFAULTS.fatG,
        waterMl: user?.waterTargetMl ?? DEFAULTS.waterMl,
      },
      todayIntake: {
        calories: todayCalories,
        proteinG: todayProtein,
        carbsG: todayCarbs,
        fatG: todayFat,
        items: todayItems,
      },
      weekIntake,
      weekAverageCalories,
      loggedDaysThisWeek: loggedDays.length,
      waterTodayMl,
      latestWeightKg: latest?.kg ?? null,
      weightChangeKg:
        latest && earliest && latest.date !== earliest.date
          ? Math.round((latest.kg - earliest.kg) * 10) / 10
          : null,
      weightWindowStart:
        latest && earliest && latest.date !== earliest.date ? earliest.date : null,
      habits,
      habitsDoneToday: activeHabits.filter((h) => doneToday.has(h._id)).length,
      streakDays: computeStreak(habitLogDates, today),
      sessions,
      trainingMinutesThisWeek: sessions.reduce((a, s) => a + s.minutes, 0),
      sessionCountThisWeek: sessions.length,
      trainedToday: sessions.some((s) => s.date === today),
      hasCustomTargets,
    };
  },
});
