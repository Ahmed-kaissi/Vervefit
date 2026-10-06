import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useFoodLog } from "@/hooks/use-food-log";
import { useHabits } from "@/hooks/use-habits";
import { useDailyCheckin } from "@/hooks/use-daily-checkin";
import { MEAL_META, MEAL_ORDER, todayStr } from "@/lib/nutrition";
import type { MealEntry, MealType } from "@/lib/nutrition";
import { TodayHero } from "@/components/vervefit/TodayHero";
import { AppHeader } from "@/components/vervefit/AppHeader";
import { BottomNav } from "@/components/vervefit/BottomNav";
import { GuestBanner } from "@/components/vervefit/GuestBanner";
import { MealSection } from "@/components/vervefit/MealSection";
import { StreakStrip } from "@/components/vervefit/StreakStrip";
import { TodayPlate } from "@/components/vervefit/TodayPlate";
import { ProteinSwaps } from "@/components/vervefit/ProteinSwaps";
import { WaterCard } from "@/components/vervefit/WaterCard";
import { GoalsSheet } from "@/components/vervefit/GoalsSheet";
import { AddFoodSheet } from "@/components/vervefit/AddFoodSheet";
import { DailyCheckinChip } from "@/components/vervefit/DailyCheckin";
import { StreakWidget } from "@/components/vervefit/StreakWidget";

function sectionStats(entries: MealEntry[], mealType: MealType) {
  const list = entries.filter((e) => e.mealType === mealType);
  return { calories: list.reduce((acc, e) => acc + e.calories, 0) };
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { user } = useAuth();
  const date = todayStr();
  const log = useFoodLog(date);
  const { streak, isGuest: habitsGuest } = useHabits(date);
  const { checkedInToday, lastCheckin, checkin } = useDailyCheckin(date);

  const [goalsOpen, setGoalsOpen] = useState(false);
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [addMealType, setAddMealType] = useState<MealType>("breakfast");

  const { entries, totals, targets, isGuest, removeEntry, addEntry } = log;

  const openAdd = (mealType: MealType) => {
    setAddMealType(mealType);
    setAddFoodOpen(true);
  };

  const userName =
    typeof user === "object" && user !== null && "name" in user
      ? (user as { name?: string }).name
      : null;

  return (
    <div className="flex min-h-dvh flex-col bg-[#0B0B0B] text-[#E8E8E8]">
      <AppHeader user={user} />
      {isGuest && <GuestBanner />}

      <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 pb-[calc(var(--nav-h)+4.5rem)] pt-5 md:px-6">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#CEFF00]">
            {greeting()}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#E8E8E8]">
            {isGuest ? "Ready for today?" : `Your day, ${userName ?? "foodie"}`}
          </h1>
        </header>

        <TodayHero totals={totals} targets={targets} />

        <ProteinSwaps date={date} />

        <DailyCheckinChip
          checkedInToday={checkedInToday}
          lastCheckin={lastCheckin}
          onCheckin={checkin}
        />

        <StreakWidget streak={streak} date={date} />

        <div className="mt-4 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs font-semibold text-[#CEFF00] hover:bg-[#2A2A2E] hover:text-[#CEFF00]"
            onClick={() => setGoalsOpen(true)}
          >
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true">🎯</span>
              Goals &amp; targets
            </span>
          </Button>
        </div>

        <TodayPlate entries={entries} onAdd={openAdd} />

        <StreakStrip />

        {/* Meal sections */}
        <div className="space-y-4">
          {MEAL_ORDER.map((m) => (
            <MealSection
              key={m}
              title={MEAL_META[m].label}
              mealType={m}
              entries={entries.filter((e) => e.mealType === m)}
              onAdd={() => openAdd(m)}
              onRemove={removeEntry}
              totals={sectionStats(entries, m)}
            />
          ))}
        </div>

        <WaterCard />

        {habitsGuest && (
          <p className="pb-2 text-center text-[11px] text-[#9A9A9A]">
            Sign in to sync your streak, habits and water across devices.
          </p>
        )}
      </main>

      {/* FAB */}
      <button
        type="button"
        className="fixed bottom-[calc(var(--nav-h)+0.5rem)] right-5 z-50 flex size-14 items-center justify-center rounded-full bg-[#CEFF00] text-[#0B0B0B] shadow-glow transition-transform active:scale-95 hover:scale-105"
        onClick={() => openAdd("snack")}
        aria-label="Add food"
      >
        <span className="text-2xl leading-none">+</span>
      </button>

      <BottomNav />

      <AddFoodSheet
        key={`${addMealType}-${addFoodOpen ? "open" : "closed"}`}
        open={addFoodOpen}
        onOpenChange={setAddFoodOpen}
        initialMealType={addMealType}
        date={date}
        addEntry={addEntry}
      />
      <GoalsSheet open={goalsOpen} onOpenChange={setGoalsOpen} />
      <span className="sr-only">Streak: {streak} days</span>
    </div>
  );
}
