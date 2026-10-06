import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { useHabits } from "@/hooks/use-habits";
import { cn } from "@/lib/utils";

/** Streak summary plus a 14-day completion grid. */
export function StreakStrip() {
  const { streak, history, completedToday, habits } = useHabits();

  return (
    <section
      aria-label="Daily streak"
      className="overflow-hidden rounded-2xl border border-[#2A2A2E] bg-[#141414] p-5 shadow-card"
    >
      {/* ambient glow */}
      <div
        className="pointer-events-none absolute -right-12 -top-8 h-28 w-28 rounded-full blur-3xl opacity-30"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(206,255,0,0.6), transparent 70%)",
        }}
      />

      <header className="mb-4 flex items-center justify-between relative">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#E8E8E8]">
          <span className="flex size-7 items-center justify-center rounded-lg bg-[#CEFF00]/10 text-[#CEFF00] shadow-glow">
            <Flame className="size-4" aria-hidden="true" />
          </span>
          Daily streak
        </h2>
        <motion.p
          className="text-2xl font-extrabold tracking-tight text-[#CEFF00]"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
        >
          {streak}
          <span className="ml-1 text-xs font-semibold text-[#9A9A9A]">
            {streak === 1 ? "day" : "days"}
          </span>
        </motion.p>
      </header>

      <div className="flex items-end justify-between gap-1" aria-hidden="true">
        {history.map((day, idx) => {
          const done = day.count > 0;
          return (
            <motion.div
              key={day.date}
              title={`${day.date}: ${day.count} done`}
              className="flex flex-1 flex-col items-center gap-1.5"
              initial={{ scaleY: 0.2, opacity: 0.4 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ delay: idx * 0.04, duration: 0.35, ease: "backOut" }}
            >
              <div
                className={cn(
                  "h-8 w-full rounded-md transition-colors",
                  done
                    ? "bg-gradient-to-t from-[#CEFF00] to-[#00C853] shadow-glow"
                    : "bg-[#2A2A2E]",
                )}
              />
            </motion.div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-[#9A9A9A]">
        {habits.length === 0
          ? "Add a habit to start your streak."
          : `${completedToday} of ${habits.length} habits done today`}
      </p>
    </section>
  );
}
