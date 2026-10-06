import { memo } from "react";
import { motion } from "framer-motion";
import type { DateTotals } from "@/hooks/use-food-log";
import { CalorieRing } from "@/components/vervefit/CalorieRing";
import { MacroBars } from "@/components/vervefit/MacroBars";
import { cn } from "@/lib/utils";

interface Props {
  totals: DateTotals;
  targets: {
    dailyCalorieTarget: number;
    proteinTargetG: number;
    carbsTargetG: number;
    fatTargetG: number;
  };
}

export const TodayHero = memo(function TodayHero({ totals, targets }: Props) {
  const consumed = totals.calories;
  const target = targets.dailyCalorieTarget ?? 2000;
  const remaining = Math.max(target - consumed, 0);
  const over = consumed > target;
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0;
  const isEmpty = consumed === 0;

  const stateLabel =
    isEmpty
      ? "Start logging to see your day"
      : over
        ? "You've gone over today"
        : pct < 0.25
          ? "Just getting started"
          : pct < 0.5
            ? "Making solid progress"
            : pct < 0.75
              ? "More than halfway there"
              : pct < 0.9
                ? "Almost at your target"
                : "Right near your limit";

  const stateColor =
    isEmpty
      ? "#9A9A9A"
      : over
        ? "#FF6D00"
        : pct < 0.9
          ? "#00C853"
          : "#FFD600";

  return (
    <section className="overflow-hidden rounded-2xl border border-[#2A2A2E] bg-[#141414] p-5 shadow-card sm:p-6">
      {/* decorative blur behind the ring */}
      <div
        className="pointer-events-none absolute -left-6 -top-6 h-32 w-32 rounded-full blur-3xl opacity-30"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(206,255,0,0.5), transparent 70%)",
        }}
      />

      <div className="relative flex flex-col items-center gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <CalorieRing totals={totals} targets={targets} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <MacroBars totals={totals} targets={targets} />
        </motion.div>

        <motion.div
          className={cn("w-full max-w-[240px] text-center", isEmpty && "mt-1")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <p
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: stateColor }}
          >
            {stateLabel}
          </p>
          <p className="mt-1.5 text-xs font-medium text-[#9A9A9A]/80">
            {isEmpty ? (
              <span className="text-[#9A9A9A]/60">
                {Math.round(target).toLocaleString()} kcal available today
              </span>
            ) : over ? (
              <span className="text-[#FF6D00]/90">
                {Math.round(consumed).toLocaleString()} / {Math.round(target).toLocaleString()} kcal
                {" · +"}{Math.round(consumed - target).toLocaleString()} over
              </span>
            ) : (
              <span className="text-[#9A9A9A]/80">
                {Math.round(consumed).toLocaleString()} / {Math.round(target).toLocaleString()} kcal
                {" · "}{Math.round(remaining).toLocaleString()} kcal left
              </span>
            )}
          </p>
        </motion.div>
      </div>
    </section>
  );
});

export default TodayHero;
