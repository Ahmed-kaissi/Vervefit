/**
 * The AI domain contract.
 *
 * These types are shared by the front-end (use-coach.ts, CoachChat.tsx) and
 * the server (aiServer.ts, ai/provider.ts, ai/router.ts, ai/dispatch.ts).
 * Import from this module rather than re-declaring the same shapes.
 */

// The shared coach contract lives in src/lib/coach-core.
export type {
  CoachProviderId,
  FailureKind,
  CoachRequest,
  CoachReply,
  CoachCallResult,
  CoachDiagnostics,
} from "../../lib/coach-core";

/** The shape of a validated deterministic answer the coach can return. */
export interface CoachFacts {
  today: string;
  name: string | null;
  goal: string | null;
  fitnessLevel: string | null;
  sex: string | null;
  age: number | null;
  heightCm: number | null;
  targets: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    waterMl: number;
  };
  todayIntake: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    items: number;
  };
  weekIntake: Array<{ date: string; calories: number; proteinG: number; logged: boolean }>;
  weekAverageCalories: number | null;
  loggedDaysThisWeek: number;
  waterTodayMl: number;
  latestWeightKg: number | null;
  weightChangeKg: number | null;
  weightWindowStart: string | null;
  habits: Array<{ name: string; doneToday: boolean }>;
  habitsDoneToday: number;
  streakDays: number;
  sessions: Array<{ date: string; name: string; minutes: number }>;
  trainingMinutesThisWeek: number;
  sessionCountThisWeek: number;
  trainedToday: boolean;
  hasCustomTargets: boolean;
}

/** One bucket of a day's food intake, used for the 7-day rolling window. */
export interface CoachDayIntake {
  date: string;
  calories: number;
  proteinG: number;
  logged: boolean;
}

/** A summary of one habit, one day. */
export interface CoachHabitSummary {
  name: string;
  doneToday: boolean;
}

/** A summary of one completed training session. */
export interface CoachSessionSummary {
  date: string;
  name: string;
  minutes: number;
}
