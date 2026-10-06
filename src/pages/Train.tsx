import { useAuth } from "@/hooks/use-auth";
import { useWorkouts } from "@/hooks/use-body";
import { AppHeader } from "@/components/vervefit/AppHeader";
import { BottomNav } from "@/components/vervefit/BottomNav";
import { GuestBanner } from "@/components/vervefit/GuestBanner";
import { TrainingCard } from "@/components/vervefit/TrainingCard";

export default function Train() {
  const { user } = useAuth();
  const { totalMinutes, totalBurn, isGuest, trainedToday } = useWorkouts(7);

  return (
    <div className="flex min-h-dvh flex-col bg-[#0B0B0B] text-[#E8E8E8]">
      <AppHeader user={user} />
      {isGuest && <GuestBanner />}

      <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 pb-28 pt-5 md:px-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#CEFF00]">
            Training
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#E8E8E8]">
            Train with a guide
          </h1>
          <p className="mt-1 text-sm text-[#9A9A9A]">
            Your split plans the week. Swap any exercise you can&apos;t do, and
            run it with a built-in timer.
          </p>
        </header>

        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "This week", value: `${totalMinutes}m` },
            { label: "Calories", value: `${totalBurn}` },
            {
              label: "Status",
              value: trainedToday ? "Done" : "Rest",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-[#2A2A2E] bg-[#141414] p-3 text-center shadow-card"
            >
              <p className="text-lg font-extrabold tracking-tight text-[#E8E8E8]">
                {stat.value}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-[#9A9A9A]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <TrainingCard />
      </main>

      <BottomNav />
    </div>
  );
}
