import { memo } from "react";
import type { DateTotals } from "@/hooks/use-food-log";

interface Props {
  totals: DateTotals;
  targets: { dailyCalorieTarget: number };
}

export const CalorieRing = memo(function CalorieRing({ totals, targets }: Props) {
  const consumed = totals.calories;
  const target = targets.dailyCalorieTarget ?? 2000;
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0;
  const remaining = Math.max(target - consumed, 0);
  const over = consumed > target;
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference * (1 - pct);

  return (
    <div className="relative mx-auto h-[200px] w-[200px]">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="vervefit-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#CEFF00" />
            <stop offset="55%" stopColor="#00C853" />
            <stop offset="100%" stopColor="#00C853" />
          </linearGradient>
        </defs>
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="url(#vervefit-ring)"
          strokeWidth="14"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 700ms ease-out" }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {over ? (
          <>
            <span className="text-3xl font-extrabold tracking-tight text-[#FF0033]">
              +{Math.round(consumed - target)}
            </span>
            <span className="text-[11px] font-medium text-[#9A9A9A]">
              kcal over target
            </span>
          </>
        ) : (
          <>
            <span className="text-4xl font-extrabold tracking-tight text-[#E8E8E8]">
              {Math.round(remaining).toLocaleString()}
            </span>
            <span className="text-[11px] font-medium text-[#9A9A9A]">
              kcal left today
            </span>
          </>
        )}
        <span className="mt-2 text-[12px] font-medium text-[#9A9A9A]/70">
          {Math.round(consumed).toLocaleString()} / {Math.round(target).toLocaleString()} kcal
        </span>
      </div>
    </div>
  );
});
