import { motion } from "framer-motion";
import type { DateTotals } from "@/hooks/use-food-log";

interface Props {
  totals: DateTotals;
  targets: {
    proteinTargetG: number;
    carbsTargetG: number;
    fatTargetG: number;
  };
}

type MacroKey = "proteinG" | "carbsG" | "fatG";

const MACRO_META: Array<{
  key: MacroKey;
  label: string;
  unit: string;
  icon: string;
  fill: string;
  glow: string;
  targetKey: keyof Props["targets"];
  note: string;
}> = [
  {
    key: "proteinG" as const,
    label: "Protein",
    unit: "g",
    icon: "💪",
    fill: "#00C853",
    glow: "rgba(0,200,83,0.35)",
    targetKey: "proteinTargetG",
    note: "Builds and repairs muscle. Higher intakes support training and recovery.",
  },
  {
    key: "carbsG" as const,
    label: "Carbs",
    unit: "g",
    icon: "🌾",
    fill: "#FFB300",
    glow: "rgba(255,179,0,0.35)",
    targetKey: "carbsTargetG",
    note: "Fuel for workouts and daily energy. Fill the rest of your calories here.",
  },
  {
    key: "fatG" as const,
    label: "Fat",
    unit: "g",
    icon: "🧴",
    fill: "#64B5F6",
    glow: "rgba(100,181,246,0.35)",
    targetKey: "fatTargetG",
    note: "Hormone health, satiety and nutrient absorption. Don't drop too low.",
  },
];



export function MacroBars({ totals, targets }: Props) {
  return (
    <div className="mt-5 space-y-3">
      {MACRO_META.map((m, idx) => {
        const value = totals[m.key];
        const numericTarget = targets[m.targetKey];
        const pct = numericTarget > 0 ? Math.min(value / numericTarget, 1.35) : 0;
        const over = numericTarget > 0 && value > numericTarget;

        return (
          <motion.div
            key={m.key}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 * idx, duration: 0.35 }}
          >
            <div className="flex items-center gap-3">
              <div className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <span className="text-sm">{m.icon}</span>
              </div>

              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-[#9A9A9A]">
                    <span className="font-semibold text-[#E8E8E8]">{m.label}</span>
                    <span className="text-[#9A9A9A]/60 ml-1">{m.note}</span>
                  </span>
                  <span className="font-semibold tabular-nums text-[#E8E8E8]">
                    {Math.round(value).toLocaleString()}
                    <span className="text-[10px] font-normal text-[#9A9A9A]/70"> {m.unit}</span>
                    <span className="ml-1 text-[10px] font-normal text-[#9A9A9A]/60">/ {Math.round(numericTarget ?? 0)}</span>
                  </span>
                </div>

                <div className="relative h-2.5 overflow-hidden rounded-full bg-[#2A2A2E]">
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.25 + 0.15 * idx, duration: 0.5, ease: "easeOut" }}
                    style={{
                      background: `linear-gradient(90deg, ${m.fill}, ${m.fill}dd)`,
                      boxShadow: `inset 0 0 8px ${m.glow}`,
                    }}
                  />
                  <div
                    className="absolute right-0 top-0 h-full w-1 rounded-r-full bg-white/10"
                    aria-hidden="true"
                  />
                  {over && (
                    <motion.div
                      className="absolute inset-y-0 right-0 w-0.5 rounded-full"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 + 0.15 * idx }}
                      style={{ background: m.fill, boxShadow: `0 0 8px ${m.glow}` }}
                    />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
