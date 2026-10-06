import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useFoodLog } from "@/hooks/use-food-log";
import { useWeightLog } from "@/hooks/use-body";
import { todayStr } from "@/lib/nutrition";
import { AppHeader } from "@/components/vervefit/AppHeader";
import { BottomNav } from "@/components/vervefit/BottomNav";
import { GuestBanner } from "@/components/vervefit/GuestBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CalorieHistory,
  MacroSplit,
  TrainingMinutesChart,
  WeightChart,
} from "@/components/vervefit/ProgressCharts";
import { torchTargetsFromProfile } from "@/lib/nutrition";

export default function Progress() {
  const { user } = useAuth();
  const date = todayStr();
  const { totals, targets, weekTotals, isGuest } = useFoodLog(date);
  const { latest, setWeight } = useWeightLog(30, date);

  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);

  const save = async () => {
    const kg = Number(draft);
    if (!Number.isFinite(kg) || kg <= 0) return;
    await setWeight(kg);
    setDraft("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#0B0B0B] text-[#E8E8E8]">
      <AppHeader user={user} />
      {isGuest && <GuestBanner />}

      <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 pb-28 pt-5 md:px-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#CEFF00]">
            Progress
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#E8E8E8]">
            See it working
          </h1>
          <p className="mt-1 text-sm text-[#9A9A9A]">
            Weight, calories and training — all on one readable screen.
          </p>
        </header>

        <section className="rounded-2xl border border-[#2A2A2E] bg-[#141414] p-5 shadow-card">
          <h2 className="text-sm font-semibold text-[#E8E8E8]">
            Log today&apos;s weight
          </h2>
          <p className="mt-1 text-xs text-[#9A9A9A]">
            {latest
              ? `Last check-in: ${latest.kg} kg on ${latest.date}`
              : "No check-ins yet — one number is enough to start the trend."}
          </p>
          <div className="mt-3 flex gap-2">
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="20"
              max="400"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void save();
              }}
              placeholder="e.g. 72.4"
              className="h-10"
            />
            <Button
              type="button"
              onClick={save}
              disabled={!draft.trim()}
              className="bg-[#CEFF00] text-[#0B0B0B] shadow-glow"
            >
              {saved ? "Saved" : "Save"}
            </Button>
          </div>
        </section>

        <WeightChart />
        <CalorieHistory weekTotals={weekTotals} targets={targets} />
        <MacroSplit totals={totals} />
        <TrainingMinutesChart />
      </main>

      <BottomNav />
    </div>
  );
}
