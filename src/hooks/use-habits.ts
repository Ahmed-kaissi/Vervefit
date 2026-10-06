import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import {
  addHabit as guestAddHabit,
  removeHabit as guestRemoveHabit,
  toggleHabit as guestToggleHabit,
  getHabits as guestGetHabits,
  getHabitLogs as guestGetHabitLogs,
  subscribe,
} from "@/lib/guest-activity";
import { computeStreak, lastNDates, todayStr } from "@/lib/nutrition";

export interface Habit {
  id: string;
  name: string;
  icon?: string;
}

interface CloudHabit {
  _id: string;
  name: string;
  icon?: string;
  archived?: boolean;
}

interface CloudHabitLog {
  _id: string;
  habitId: string;
  date: string;
}

/** The subset of a habit log the UI needs; guest logs are mapped into it. */
interface GuestHabitLogRow {
  _id: string;
  habitId: string;
  date: string;
}

function toGuestLogRows(
  logs: Array<{ habitId: string; date: string }>,
): GuestHabitLogRow[] {
  return logs.map((log, index) => ({
    _id: `${log.habitId}-${log.date}-${index}`,
    habitId: log.habitId,
    date: log.date,
  }));
}

export function useHabits(dateInput?: string) {
  const date = dateInput ?? todayStr();
  const { isLoading, isAuthenticated } = useAuth();
  const isGuest = !isLoading && !isAuthenticated;

  const [guestHabits, setGuestHabits] = useState<Habit[]>(() =>
    guestGetHabits(),
  );
  const [guestLogs, setGuestLogs] = useState<GuestHabitLogRow[]>(() => []);
  useEffect(() => {
    if (!isGuest) return;
    const sync = () => {
      setGuestHabits(guestGetHabits());
      setGuestLogs(toGuestLogRows(guestGetHabitLogs()));
    };
    sync();
    return subscribe(sync);
  }, [isGuest]);

  const cloudHabits = useQuery(
    api.habits.list,
    isGuest ? "skip" : {},
  ) as CloudHabit[] | undefined | null;
  const window30 = useMemo(() => {
    const days = lastNDates(30, date);
    return { start: days[0], end: date };
  }, [date]);
  const cloudLogs = useQuery(
    api.habits.logsInRange,
    isGuest ? "skip" : window30,
  ) as CloudHabitLog[] | undefined | null;

  const addMutation = useMutation(api.habits.add);
  const removeMutation = useMutation(api.habits.remove);
  const toggleMutation = useMutation(api.habits.toggle);

  const habits: Habit[] = useMemo(() => {
    if (isGuest) return guestHabits;
    return (cloudHabits ?? []).map((h) => ({
      id: h._id,
      name: h.name,
      icon: h.icon,
    }));
  }, [isGuest, cloudHabits, guestHabits]);

  const logs: CloudHabitLog[] = useMemo(() => {
    if (isGuest) return guestLogs;
    return cloudLogs ?? [];
  }, [isGuest, cloudLogs, guestLogs]);

  const doneToday = useMemo(
    () => new Set(logs.filter((l) => l.date === date).map((l) => l.habitId)),
    [logs, date],
  );

  /** 14-day completion grid, oldest first, for the habit streak strip. */
  const history = useMemo(() => {
    const days = lastNDates(14, date);
    return days.map((d) => ({
      date: d,
      count: logs.filter((l) => l.date === d).length,
    }));
  }, [logs, date]);

  const streak = useMemo(
    () => computeStreak(new Set(logs.map((l) => l.date)), date),
    [logs, date],
  );

  const completedToday = useMemo(
    () => habits.filter((h) => doneToday.has(h.id)).length,
    [habits, doneToday],
  );

  const addHabit = useCallback(
    async (name: string, icon?: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (isGuest) {
        guestAddHabit(trimmed, icon);
        return;
      }
      await addMutation({ name: trimmed, icon });
    },
    [isGuest, addMutation],
  );

  const removeHabit = useCallback(
    async (habitId: string) => {
      if (isGuest) {
        guestRemoveHabit(habitId);
        return;
      }
      await removeMutation({ habitId: habitId as never });
    },
    [isGuest, removeMutation],
  );

  const toggleHabit = useCallback(
    async (habitId: string) => {
      if (isGuest) {
        guestToggleHabit(habitId, date);
        return;
      }
      await toggleMutation({ habitId: habitId as never, date });
    },
    [isGuest, toggleMutation, date],
  );

  return {
    habits,
    doneToday,
    history,
    streak,
    completedToday,
    isGuest,
    addHabit,
    removeHabit,
    toggleHabit,
  };
}
