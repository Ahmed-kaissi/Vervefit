import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  getCheckin,
  logCheckinAsHabit,
  setCheckin,
  subscribe,
} from "@/lib/guest-activity";
import { todayStr } from "@/lib/nutrition";
import type { DailyCheckinRecord } from "@/components/vervefit/DailyCheckin";

export function useDailyCheckin(dateInput?: string) {
  const date = dateInput ?? todayStr();
  const { isLoading, isAuthenticated } = useAuth();
  const isGuest = !isLoading && !isAuthenticated;

  const [lastCheckin, setLastCheckin] = useState<DailyCheckinRecord | null>(
    null,
  );

  useEffect(() => {
    if (!isGuest) {
      setLastCheckin(null);
      return;
    }
    const sync = () => {
      const record = getCheckin(date);
      setLastCheckin(record ? { date: record.date, at: record.at } : null);
    };
    sync();
    return subscribe(() => sync());
  }, [isGuest, date]);

  const checkedInToday =
    lastCheckin !== null && lastCheckin.date === date;

  const checkin = useCallback(() => {
    if (isGuest) {
      setCheckin(date);
      logCheckinAsHabit(date);
      // Optimistically track the local state so the chip reflects the result
      // immediately, before the subscription notification arrives.
      setLastCheckin({ date, at: Date.now() });
      return;
    }
    // Signed-in users: the check-in is stored server-side.
    // Mirror the optimism for the same UI consistency, pending a real
    // server sync (P0: wire the signed-in path to a Convex mutation).
    setLastCheckin((prev) =>
      prev?.date === date ? prev : { date, at: Date.now() },
    );
  }, [isGuest, date]);

  return { checkedInToday, lastCheckin, checkin };
}
