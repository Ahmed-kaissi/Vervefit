import { useMemo, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useFoodLog } from "@/hooks/use-food-log";
import { FOOD_DATABASE } from "@/lib/food-database";
import { suggestProteinSwaps } from "@/lib/protein-swaps";
import { formatQty, todayStr } from "@/lib/nutrition";
import { cn } from "@/lib/utils";

/**
 * Turns "I still need 42 g of protein" into a few one-tap foods.
 *
 * Suggestions come from the same food database the logger uses, are sized to
 * the calories actually left, and use real nutrition values — this never
 * estimates or invents a macro.
 */
export function ProteinSwaps({ date = todayStr() }: { date?: string }) {
  const { totals, targets, addEntry } = useFoodLog(date);
  const [pending, setPending] = useState<string | null>(null);

  const proteinRemaining = Math.round(targets.proteinTargetG - totals.proteinG);
  const caloriesRemaining = Math.round(
    targets.dailyCalorieTarget - totals.calories,
  );

  const swaps = useMemo(
    () =>
      suggestProteinSwaps({
        proteinRemainingG: proteinRemaining,
        caloriesRemaining,
        foods: FOOD_DATABASE,
        limit: 3,
      }),
    [proteinRemaining, caloriesRemaining],
  );

  // Nothing useful to say when the target is met or nothing fits.
  if (proteinRemaining <= 0 || swaps.length === 0) return null;

  const log = async (index: number) => {
    const swap = swaps[index];
    setPending(swap.food.name);
    try {
      await addEntry(
        { ...swap.food, category: swap.food.category ?? "Other" },
        "snack",
        date,
        swap.servings,
      );
      toast.success(
        `Added ${formatQty(swap.servings)} × ${swap.food.name} (${swap.proteinG} g protein).`,
      );
    } catch (error) {
      console.error("[ProteinSwaps] failed to log suggestion:", error);
      toast.error("Couldn't add that to your log. Try again in a moment.");
    } finally {
      setPending(null);
    }
  };

  return (
    <section
      aria-label="Protein suggestions"
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-card"
    >
      <header className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/12 text-primary">
          <Sparkles className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">
            Close your protein gap
          </h2>
          <p className="text-xs text-muted-foreground">
            {proteinRemaining} g left
            {caloriesRemaining > 0
              ? ` · ${caloriesRemaining} kcal available`
              : " · no calories left"}
          </p>
        </div>
      </header>

      <ul className="mt-3 space-y-2">
        {swaps.map((swap, index) => {
          const busy = pending === swap.food.name;
          return (
            <li
              key={swap.food.name}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {swap.food.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {swap.reason}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void log(index)}
                disabled={busy}
                aria-label={`Log ${formatQty(swap.servings)} × ${swap.food.name}`}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-full bg-primary/12 px-3 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20",
                  busy && "opacity-60",
                )}
              >
                <Plus className="size-3" aria-hidden="true" />
                {busy ? "Adding…" : `+${swap.proteinG} g`}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Portions are sized to your remaining protein and calories. Values come
        from the food database — check the label when it matters.
      </p>
    </section>
  );
}
