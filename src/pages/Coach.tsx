import { useFoodLog } from "@/hooks/use-food-log";
import { useHabits } from "@/hooks/use-habits";
import { useWater } from "@/hooks/use-water";
import { useWorkouts } from "@/hooks/use-body";
import { useCoach } from "@/hooks/use-coach";
import { useAuth } from "@/hooks/use-auth";
import { todayStr } from "@/lib/nutrition";
import { AppHeader } from "@/components/vervefit/AppHeader";
import { BottomNav } from "@/components/vervefit/BottomNav";
import { CoachChat } from "@/components/vervefit/CoachChat";
import { Flame, Dumbbell, Droplets } from "lucide-react";

/** Live proof for the user that the coach is reading their real data. */
function ContextStrip() {
  const date = todayStr();
  const { totals, targets } = useFoodLog(date);
  const { streak } = useHabits();
  const { ml, targetMl } = useWater();
  const { sessions } = useWorkouts(7, date);

  const kcalTarget = targets.dailyCalorieTarget ?? 2000;
  const kcalPct =
    kcalTarget > 0 ? Math.min(totals.calories / kcalTarget, 1) : 0;
  const waterPct = targetMl > 0 ? Math.min(ml / targetMl, 1) : 0;
  const minutes = sessions.reduce((a, s) => a + s.minutes, 0);

  const stats = [
    {
      icon: Flame,
      label: "Calories",
      value: `${Math.round(totals.calories)}`,
      unit: `/ ${kcalTarget}`,
      pct: kcalPct,
    },
    {
      icon: Droplets,
      label: "Water",
      value: `${(ml / 1000).toFixed(1)}`,
      unit: `/ ${(targetMl / 1000).toFixed(1)} L`,
      pct: waterPct,
    },
    {
      icon: Dumbbell,
      label: "Streak",
      value: `${streak}`,
      unit: streak === 1 ? "day" : "days",
      pct: null,
    },
  ];

  return (
    <section
      aria-label="Your data this week"
      className="rounded-2xl border border-[#2A2A2E] bg-[#141414] p-4 shadow-card"
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9A9A9A]">
        What your coach can see
      </p>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="flex items-center gap-1.5">
              <span
                className={`size-1.5 rounded-full ${stat.pct !== null ? "bg-[#CEFF00]" : "bg-[#9A9A9A]"}`}
                aria-hidden="true"
              />
              <span className="text-[11px] font-semibold text-[#9A9A9A]">
                {stat.label}
              </span>
            </div>
            <p className="mt-1 text-lg font-extrabold leading-none tracking-tight text-[#E8E8E8]">
              {stat.value}
              <span className="ml-1 text-[10px] font-semibold text-[#9A9A9A]">
                {stat.unit}
              </span>
            </p>
            {stat.pct !== null && (
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#2A2A2E]">
                <div
                  className="h-full rounded-full bg-[#CEFF00]"
                  style={{ width: `${Math.round(stat.pct * 100)}%` }}
                />
              </div>
            )}
            {stat.pct === null && (
              <p className="mt-2 text-[10px] text-[#9A9A9A]">
                {minutes} min trained
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Coach() {
  const { user } = useAuth();
  const coach = useCoach();

  return (
    <div className="flex min-h-dvh flex-col bg-[#0B0B0B] text-[#E8E8E8]">
      <AppHeader user={user} />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-28 pt-5 md:px-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#CEFF00]">
            Coach
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#E8E8E8]">
            A coach in your pocket
          </h1>
          <p className="mt-1 text-sm text-[#9A9A9A]">
            Ask about your meals, your streak, or what to do next.
          </p>
        </header>

        <ContextStrip />

        <CoachChat
          isGuest={coach.isGuest}
          messages={coach.messages}
          sending={coach.sending}
          sendingText={coach.sendingText}
          error={coach.error}
          status={coach.status}
          checking={coach.checking}
          suggestions={coach.suggestions}
          tier={coach.tier}
          onTierChange={coach.setTier}
          onSend={coach.send}
          onReset={coach.reset}
        />
      </main>

      <BottomNav />
    </div>
  );
}
