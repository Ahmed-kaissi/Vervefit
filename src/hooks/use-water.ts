import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { getWater, addWater as guestAddWater, subscribe } from "@/lib/guest-activity";
import { todayStr } from "@/lib/nutrition";

/** One-tap amounts, in millilitres. */
export const WATER_PRESETS = [250, 500, 750] as const;
export const DEFAULT_WATER_TARGET_ML = 2000;
const GLASS_ML = 250;

export function useWater(dateInput?: string) {
  const date = dateInput ?? todayStr();
  const { isLoading, isAuthenticated } = useAuth();
  const isGuest = !isLoading && !isAuthenticated;

  // Guest data is mirrored into state so every render reads a consistent
  // snapshot instead of poking sessionStorage during render.
  const [guestMl, setGuestMl] = useState(0);
  useEffect(() => {
    if (!isGuest) return;
    const sync = () => setGuestMl(getWater(date));
    sync();
    return subscribe(sync);
  }, [isGuest, date]);

  const cloud = useQuery(
    api.activity.waterForDay,
    isGuest ? "skip" : { date },
  ) as { ml: number; targetMl: number } | undefined | null;
  const addMutation = useMutation(api.activity.addWater);

  const ml = isGuest ? guestMl : (cloud?.ml ?? 0);
  const targetMl = cloud?.targetMl ?? DEFAULT_WATER_TARGET_ML;
  const glasses = Math.round(ml / GLASS_ML);
  const pct = targetMl > 0 ? Math.min(ml / targetMl, 1) : 0;

  const addWater = useCallback(
    async (amount: number) => {
      if (isGuest) {
        guestAddWater(date, amount);
        return;
      }
      await addMutation({ date, ml: amount });
    },
    [isGuest, addMutation, date],
  );

  return {
    date,
    ml,
    targetMl,
    glasses,
    pct,
    isGuest,
    addWater,
    addGlass: () => addWater(GLASS_ML),
    removeGlass: () => addWater(-GLASS_ML),
  };
}
