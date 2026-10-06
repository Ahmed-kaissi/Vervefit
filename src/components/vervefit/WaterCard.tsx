import { Droplet, Minus, Plus } from "lucide-react";
import { useWater, WATER_PRESETS } from "@/hooks/use-water";
import { cn } from "@/lib/utils";

/**
 * Water intake tracker. Tapping a preset logs that amount in one tap; the
 * stepper handles the odd 100ml top-up without opening a sheet.
 */
export function WaterCard() {
  const { ml, targetMl, glasses, pct, addWater, removeGlass } = useWater();

  return (
    <section
      aria-label="Water intake"
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-card"
    >
      <header className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="flex size-7 items-center justify-center rounded-lg bg-water/12 text-water">
            <Droplet className="size-4" aria-hidden="true" />
          </span>
          Hydration
        </h2>
        <span className="text-xs font-medium text-muted-foreground">
          {glasses} / {Math.round(targetMl / 250)} glasses
        </span>
      </header>

      <div className="mb-1 flex items-end justify-between">
        <p className="text-2xl font-extrabold tracking-tight text-foreground">
          {(ml / 1000).toFixed(2)}
          <span className="ml-1 text-sm font-semibold text-muted-foreground">
            / {(targetMl / 1000).toFixed(1)} L
          </span>
        </p>
        <p className="pb-1 text-xs font-semibold text-water">
          {Math.round(pct * 100)}%
        </p>
      </div>

      <div
        className="mb-4 h-2.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(pct * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Water intake progress"
      >
        <div
          className="h-full rounded-full bg-water transition-[width] duration-500"
          style={{ width: `${pct * 100}%` }}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={removeGlass}
          disabled={ml <= 0}
          aria-label="Remove a glass of water"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>

        <div className="grid flex-1 grid-cols-3 gap-2">
          {WATER_PRESETS.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => addWater(amount)}
              className="flex items-center justify-center gap-1.5 rounded-full bg-water/10 py-2.5 text-xs font-bold text-water transition-colors hover:bg-water/20"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              {amount}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-4 flex justify-between gap-1" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <li
            key={i}
            className={cn(
              "h-8 flex-1 rounded-md border transition-colors",
              i < glasses
                ? "border-water/40 bg-water/25"
                : "border-border/70 bg-muted/40",
            )}
          />
        ))}
      </ul>
    </section>
  );
}
