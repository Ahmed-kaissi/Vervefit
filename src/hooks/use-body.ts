import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import {
  getWeights,
  setWeight as guestSetWeight,
  getSessions,
  addSession as guestAddSession,
  removeSession as guestRemoveSession,
  subscribe,
} from "@/lib/guest-activity";
import type { GuestSession } from "@/lib/guest-activity";
import { lastNDates, todayStr } from "@/lib/nutrition";

/* ------------------------------- weight ------------------------------- */

interface CloudWeight {
  _id: string;
  date: string;
  kg: number;
}

export function useWeightLog(days = 30, dateInput?: string) {
  const end = dateInput ?? todayStr();
  const { isLoading, isAuthenticated } = useAuth();
  const isGuest = !isLoading && !isAuthenticated;

  const [guestWeights, setGuestWeights] = useState<CloudWeight[]>([]);
  useEffect(() => {
    if (!isGuest) return;
    const sync = () =>
      setGuestWeights(
        getWeights().map((w) => ({ _id: w.date, ...w })),
      );
    sync();
    return subscribe(sync);
  }, [isGuest]);

  const range = useMemo(() => {
    const all = lastNDates(days, end);
    return { start: all[0], end };
  }, [days, end]);

  const cloud = useQuery(
    api.activity.weightInRange,
    isGuest ? "skip" : range,
  ) as CloudWeight[] | undefined | null;
  const setMutation = useMutation(api.activity.setWeight);

  const points = useMemo(() => {
    const source = isGuest ? guestWeights : (cloud ?? []);
    return source
      .filter((p) => p.date >= range.start && p.date <= range.end)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [isGuest, cloud, guestWeights, range.start, range.end]);

  const latest = points.length > 0 ? points[points.length - 1] : null;
  const first = points.length > 0 ? points[0] : null;
  const changeKg =
    latest && first ? Math.round((latest.kg - first.kg) * 10) / 10 : 0;

  const setWeight = useCallback(
    async (kg: number) => {
      if (!Number.isFinite(kg) || kg <= 0) return;
      if (isGuest) {
        guestSetWeight(end, Math.round(kg * 10) / 10);
        return;
      }
      await setMutation({ date: end, kg: Math.round(kg * 10) / 10 });
    },
    [isGuest, setMutation, end],
  );

  return { points, latest, changeKg, isGuest, setWeight };
}

/* ------------------------------ workouts ------------------------------ */

export interface WorkoutExercise {
  name: string;
  sets?: number;
  reps?: number;
  weightKg?: number;
}

export interface WorkoutSession {
  id: string;
  date: string;
  name: string;
  focus?: string;
  minutes: number;
  calories?: number;
  exercises?: WorkoutExercise[];
}

/**
 * Fallback body weight for the burn estimate, used only when the user has
 * never logged a weight check-in so we never assume *their* weight silently.
 */
export const BURN_FALLBACK_WEIGHT_KG = 72;

function metForFocus(focus: string | undefined): number {
  return focus === "Strength"
    ? 6
    : focus === "Cardio"
      ? 9
      : focus === "Mobility"
        ? 3
        : 5;
}

/**
 * MET-based burn estimate.
 *
 * Uses the user's most recent logged weight when we have one, and a clearly
 * labelled generic weight when we don't — the previous version silently
 * assumed 72 kg for everybody, which is wrong for most people. This is an
 * estimate, not a measurement.
 */
export function burnEstimate(
  focus: string | undefined,
  minutes: number,
  weightKg?: number | null,
): { calories: number; weightKg: number; personalWeight: boolean } {
  const personal = typeof weightKg === "number" && weightKg > 0;
  const used = personal ? weightKg : BURN_FALLBACK_WEIGHT_KG;
  return {
    calories: Math.round(metForFocus(focus) * used * (minutes / 60)),
    weightKg: used,
    personalWeight: personal,
  };
}

/** Convenience wrapper when only the calorie figure is needed. */
export function estimateBurn(
  focus: string | undefined,
  minutes: number,
  weightKg?: number | null,
): number {
  return burnEstimate(focus, minutes, weightKg).calories;
}

/**
 * Prescribed sessions live in `@/lib/training-plans` now — that file owns the
 * exercise library, the program splits, and the per-exercise swaps.
 */
export function useWorkouts(days = 30, dateInput?: string) {
  const end = dateInput ?? todayStr();
  const { isLoading, isAuthenticated } = useAuth();
  const isGuest = !isLoading && !isAuthenticated;
  // The burn estimate scales with body weight, so it uses the user's own
  // latest check-in rather than a hardcoded number.
  const { latest: latestWeight } = useWeightLog(120, end);

  const [guestSessions, setGuestSessions] = useState<GuestSession[]>([]);
  useEffect(() => {
    if (!isGuest) return;
    const sync = () => setGuestSessions(getSessions());
    sync();
    return subscribe(sync);
  }, [isGuest]);

  const range = useMemo(() => {
    const all = lastNDates(days, end);
    return { start: all[0], end };
  }, [days, end]);

  const cloud = useQuery(
    api.activity.sessionsInRange,
    isGuest ? "skip" : range,
  ) as (GuestSession & { _id: string })[] | undefined | null;

  const logMutation = useMutation(api.activity.logSession);
  const removeMutation = useMutation(api.activity.removeSession);

  const sessions: WorkoutSession[] = useMemo(() => {
    const source = isGuest
      ? guestSessions
      : ((cloud ?? []) as unknown as WorkoutSession[]);
    return [...source]
      .filter((s) => s.date >= range.start && s.date <= range.end)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [isGuest, cloud, guestSessions, range.start, range.end]);

  const totalMinutes = useMemo(
    () => sessions.reduce((acc, s) => acc + s.minutes, 0),
    [sessions],
  );
  const totalBurn = useMemo(
    () => sessions.reduce((acc, s) => acc + (s.calories ?? 0), 0),
    [sessions],
  );
  const trainedToday = sessions.some((s) => s.date === end);

  const logSession = useCallback(
    async (input: {
      name: string;
      focus?: string;
      minutes: number;
      calories?: number;
      exercises?: WorkoutExercise[];
    }) => {
      const calories =
        input.calories ??
        estimateBurn(input.focus, input.minutes, latestWeight?.kg ?? null);
      if (isGuest) {
        guestAddSession({
          ...input,
          id: `gs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          calories,
          date: end,
        });
        return;
      }
      await logMutation({ ...input, calories, date: end });
    },
    [isGuest, logMutation, end, latestWeight],
  );

  const removeSession = useCallback(
    async (id: string) => {
      if (isGuest) {
        guestRemoveSession(id);
        return;
      }
      await removeMutation({ sessionId: id as never });
    },
    [isGuest, removeMutation],
  );

  return {
    sessions,
    totalMinutes,
    totalBurn,
    trainedToday,
    isGuest,
    logSession,
    removeSession,
  };
}
