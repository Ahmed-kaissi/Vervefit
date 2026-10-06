import { motion } from "framer-motion";
import { Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shortDate } from "@/lib/nutrition";

export interface DailyCheckinRecord {
  date: string;
  at: number;
}

interface Props {
  checkedInToday: boolean;
  lastCheckin: DailyCheckinRecord | null;
  onCheckin: () => void;
}

export function DailyCheckinChip({
  checkedInToday,
  lastCheckin,
  onCheckin,
}: Props) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-[#2A2A2E] bg-[#141414] p-5 shadow-card"
      role="group"
      aria-label="Daily check-in"
    >
      {/* decorative glow */}
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl transition-opacity duration-500 ${
          checkedInToday
            ? "bg-[#00C853]/25 opacity-100"
            : "bg-[#CEFF00]/20 opacity-60 group-hover:opacity-100"
        }`}
        aria-hidden="true"
      />

      <div className="relative flex items-center gap-3">
        {checkedInToday ? (
          <motion.div
            className="flex size-11 items-center justify-center rounded-full bg-[#00C853]/20 text-[#00C853] ring-2 ring-[#00C853]/30"
            animate={{
              scale: [1, 1.08, 1],
            }}
            transition={{
              repeat: Infinity,
              repeatType: "mirror",
              duration: 2.4,
            }}
          >
            <Check className="size-5.5" aria-hidden="true" />
          </motion.div>
        ) : (
          <div className="flex size-11 items-center justify-center rounded-full bg-[#CEFF00]/15 text-[#CEFF00] ring-2 ring-[#CEFF00]/25">
            <RefreshCw className="size-5" aria-hidden="true" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-bold transition-colors ${
              checkedInToday
                ? "text-[#00C853]"
                : "text-[#CEFF00]"
            }`}
          >
            {checkedInToday
              ? lastCheckin
                ? `Checked in at ${shortDate(lastCheckin.date)}`
                : "Checked in today"
              : "Daily check-in"}
          </p>
          <p className="mt-0.5 text-[11px] text-[#9A9A9A]">
            {checkedInToday
              ? lastCheckin
                ? `Last activity ${shortDate(lastCheckin.date)}`
                : "Keep it up — check in tomorrow too"
              : "Tap to log your day and keep your streak alive"}
          </p>
        </div>

        {!checkedInToday && (
          <motion.div
            initial={{ scale: 0.92, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 18 }}
          >
            <Button
              type="button"
              onClick={onCheckin}
              className="rounded-xl bg-[#CEFF00] px-5 text-sm font-bold text-[#0B0B0B] shadow-glow transition-transform active:scale-95 hover:scale-105"
            >
              <RefreshCw className="mr-1.5 size-4" aria-hidden="true" />
              Check in
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default DailyCheckinChip;
