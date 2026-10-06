import { useAuth } from "@/hooks/use-auth";
import { useHabits } from "@/hooks/use-habits";
import { useDailyCheckin } from "@/hooks/use-daily-checkin";
import { todayStr } from "@/lib/nutrition";
import { AppHeader } from "@/components/vervefit/AppHeader";
import { BottomNav } from "@/components/vervefit/BottomNav";
import { GuestBanner } from "@/components/vervefit/GuestBanner";
import { HabitsList } from "@/components/vervefit/HabitsList";
import { StreakStrip } from "@/components/vervefit/StreakStrip";
import { StreakWidget } from "@/components/vervefit/StreakWidget";
import { WaterCard } from "@/components/vervefit/WaterCard";
import { DailyCheckinChip } from "@/components/vervefit/DailyCheckin";

export default function Habits() {
  const { user } = useAuth();
  const { isGuest, completedToday, habits, streak } = useHabits();
  const date = todayStr();
  const { checkedInToday, lastCheckin, checkin } = useDailyCheckin(date);

  const pct =
    habits.length > 0 ? Math.round((completedToday / habits.length) * 100) : 0;

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <AppHeader user={user} />
      {isGuest && <GuestBanner />}

      <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 pb-28 pt-5 md:px-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Habits
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
            Small daily wins
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {habits.length > 0
              ? `${pct}% of today's habits done. Keep the momentum going.`
              : "Habits, water and a daily streak — the stuff that compounds."}
          </p>
        </header>

        <StreakStrip />

        <StreakWidget streak={streak} date={date} />

        <DailyCheckinChip checkedInToday={checkedInToday} lastCheckin={lastCheckin} onCheckin={checkin} />
        <HabitsList />
        <WaterCard />
      </main>

      <BottomNav />
    </div>
  );
}
