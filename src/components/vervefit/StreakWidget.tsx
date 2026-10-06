import { motion } from "framer-motion";
import { Flame } from "lucide-react";

interface Props {
  streak: number;
  date?: string;
}

const STREAK_COLORS = [
  "#CEFF00",
  "#FFD600",
  "#FFAB00",
  "#FF6D00",
  "#D500F9",
  "#E91E63",
  "#FF3D00",
] as const;

function streakColor(n: number): string {
  if (n === 0) return "var(--muted-foreground)";
  const idx = Math.min(n, STREAK_COLORS.length) - 1;
  const c = STREAK_COLORS[idx];
  return idx >= 4 ? c : `color-mix(in srgb, ${c} 70%, transparent)`;
}

export function StreakWidget({ streak, date }: Props) {
  const t = Date.now();
  const rotate = Math.sin(t / 1800) * 8;

  return (
    <section
      aria-label="Streak widget"
      className="relative overflow-hidden rounded-2xl border border-[#2A2A2E] bg-[#141414] p-5 shadow-card"
    >
      {/* ambient glow */}
      <div
        className="pointer-events-none absolute -right-14 -top-10 h-32 w-32 rounded-full blur-3xl opacity-40"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${streak > 0 ? "#CEFF00" : "#555"}, transparent 70%)`,
        }}
        aria-hidden="true"
      />

      <div className="relative flex items-center gap-3">
        <div
          className="flex size-11 items-center justify-center rounded-xl bg-[#CEFF00]/10 text-[#CEFF00] shadow-glow"
          style={{
            filter: `drop-shadow(0 0 ${6 + streak}px rgba(206,255,0,${0.3 + streak * 0.05}))`,
          }}
        >
          <motion.div
            animate={{ rotate }}
            transition={{ repeat: Infinity, repeatType: "mirror", duration: 2 }}
          >
            <Flame className="size-5.5" aria-hidden="true" />
          </motion.div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#E8E8E8]">
            {streak === 0
              ? "Start your streak today"
              : `${streak} day${streak === 1 ? "" : "s"} and counting`}
          </p>
          <p className="text-[11px] text-[#9A9A9A]">
            Keep the flame alive — check in daily.
          </p>
        </div>

        <motion.span
          className="shrink-0 text-3xl font-extrabold tracking-tight"
          style={{ color: streakColor(streak) }}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
        >
          {streak}
          <span className="ml-1 text-lg font-semibold text-[#9A9A9A]">
            {streak === 1 ? "d" : "ds"}
          </span>
        </motion.span>
      </div>
    </section>
  );
}

export default StreakWidget;
