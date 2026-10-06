import { useMemo, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { MAIN_GOALS, todayStr, torchTargetsFromProfile } from "@/lib/nutrition";
import { useFoodLog } from "@/hooks/use-food-log";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_GOAL = "Get Healthier";

function num(v: string, fallback: number): number {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function GoalsSheet({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { targets, saveTargets, isGuest } = useFoodLog(todayStr());

  const existingGoal =
    typeof user === "object" && user !== null && "mainGoal" in user
      ? ((user as { mainGoal?: string }).mainGoal ?? DEFAULT_GOAL)
      : DEFAULT_GOAL;

  const profile = useMemo(() => {
    const u = user as
      | {
          weightKg?: number;
          heightCm?: number;
          age?: number;
          sex?: string;
          mainGoal?: string;
        }
      | null;
    return {
      weightKg: u?.weightKg ?? 72,
      heightCm: u?.heightCm ?? 170,
      age: u?.age ?? 30,
      sex: (u?.sex ?? "male") as "male" | "female",
      mainGoal: (u?.mainGoal ?? existingGoal) as (typeof MAIN_GOALS)[number],
      activity: "light" as const,
    };
  }, [user, existingGoal]);

  const computed = useMemo(
    () => torchTargetsFromProfile(profile),
    [profile],
  );

  const [mode, setMode] = useState<"manual" | "formula">("manual");
  const [cal, setCal] = useState(String(targets.dailyCalorieTarget));
  const [protein, setProtein] = useState(String(targets.proteinTargetG));
  const [carbs, setCarbs] = useState(String(targets.carbsTargetG));
  const [fat, setFat] = useState(String(targets.fatTargetG));
  const [goal, setGoal] = useState(existingGoal);
  const [saving, setSaving] = useState(false);

  // Reseed the form whenever the sheet opens so it shows real current values
  // rather than whatever was last typed.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setCal(String(targets.dailyCalorieTarget));
      setProtein(String(targets.proteinTargetG));
      setCarbs(String(targets.carbsTargetG));
      setFat(String(targets.fatTargetG));
      setGoal(existingGoal);
    }
    wasOpen.current = open;
  }, [open, targets, existingGoal]);

  const applyFormula = () => {
    setMode("formula");
    setCal(String(computed.dailyCalorieTarget));
    setProtein(String(computed.proteinTargetG));
    setCarbs(String(computed.carbsTargetG));
    setFat(String(computed.fatTargetG));
  };

  const save = async () => {
    setSaving(true);
    const next = {
      dailyCalorieTarget: num(cal, 2000),
      proteinTargetG: num(protein, 150),
      carbsTargetG: num(carbs, 200),
      fatTargetG: num(fat, 65),
    };
    try {
      await saveTargets(next, goal);
      toast.success(
        isGuest ? "Targets saved for this session" : "Goals saved to your profile",
      );
      onOpenChange(false);
    } catch (err) {
      console.error("[GoalsSheet] save failed:", err);
      toast.error("Couldn't save your goals. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh] overflow-y-auto">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-8">
          <DrawerHeader className="text-left">
            <DrawerTitle>Daily goals</DrawerTitle>
            <DrawerDescription>
              Your calorie and macro targets for the day.
            </DrawerDescription>
          </DrawerHeader>

          <div className="mt-2 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#CEFF00]">
                {mode === "formula" ? "Formula targets" : "Manual targets"}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs font-semibold"
                onClick={mode === "formula" ? undefined : applyFormula}
              >
                {mode === "formula"
                  ? "Editing manual overrides"
                  : "Calculate from profile"}
              </Button>
            </div>

            <div className="space-y-1">
              <Label htmlFor="goal-cal">Daily calorie target</Label>
              <Input
                id="goal-cal"
                type="number"
                inputMode="numeric"
                min={800}
                max={6000}
                value={cal}
                onChange={(e) => {
                  setMode("manual");
                  setCal(e.target.value);
                }}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="goal-pro">Protein (g)</Label>
                <Input
                  id="goal-pro"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={protein}
                  onChange={(e) => {
                    setMode("manual");
                    setProtein(e.target.value);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="goal-carb">Carbs (g)</Label>
                <Input
                  id="goal-carb"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={carbs}
                  onChange={(e) => {
                    setMode("manual");
                    setCarbs(e.target.value);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="goal-fat">Fat (g)</Label>
                <Input
                  id="goal-fat"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={fat}
                  onChange={(e) => {
                    setMode("manual");
                    setFat(e.target.value);
                  }}
                />
              </div>
            </div>

            {mode === "formula" && (
              <div className="rounded-xl border border-border/70 bg-muted/30 p-3 text-xs text-[#9A9A9A]">
                <p className="font-medium text-[#E8E8E8]">Basis</p>
                <p className="mt-1 leading-relaxed">
                  Mifflin-St Jeor estimate × activity factor, then adjusted for
                  your main goal. Protein and fat scale with body weight; carbs
                  fill the remaining calories.
                </p>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="goal-select">Main goal</Label>
              <select
                id="goal-select"
                value={goal}
                onChange={(e) => {
                  setGoal(e.target.value);
                  if (mode === "formula") applyFormula();
                }}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none focus:border-primary"
              >
                {MAIN_GOALS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                className="h-11 flex-1 rounded-xl font-semibold"
                onClick={save}
                disabled={saving}
              >
                {saving ? "Saving…" : isGuest ? "Save this session" : "Save goals"}
              </Button>
              <Button
                variant="ghost"
                className="h-11 rounded-xl px-4"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
