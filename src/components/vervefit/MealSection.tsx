import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { formatQty } from "@/lib/nutrition";
import type { MealEntry, MealType } from "@/lib/nutrition";
import { MEAL_META } from "@/lib/nutrition";
import { FoodThumb } from "@/components/vervefit/FoodThumb";

interface Props {
  title: string;
  mealType: MealType;
  entries: MealEntry[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  totals: { calories: number };
}

export function MealSection({
  title,
  mealType,
  entries,
  onAdd,
  onRemove,
  totals,
}: Props) {
  // The id being confirmed for deletion, so the dialog can name the food.
  const [confirming, setConfirming] = useState<string | null>(null);
  const pending = entries.find((e) => e.id === confirming);

  const handleConfirm = () => {
    if (confirming) onRemove(confirming);
    setConfirming(null);
  };

  return (
    <section>
      <div className="flex items-center justify-between border-b border-[#2A2A2E] pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="text-2xl text-[#CEFF00]" aria-hidden="true">
            {MEAL_META[mealType].icon}
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold leading-tight text-[#E8E8E8]">{title}</h2>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#9A9A9A]">
              {MEAL_META[mealType].hint}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#9A9A9A] tabular-nums">
            {entries.length} · {Math.round(totals.calories).toLocaleString()} kcal
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-[#9A9A9A] hover:bg-[#2A2A2E] hover:text-[#CEFF00]"
            onClick={onAdd}
            aria-label={`Add food to ${title}`}
          >
            <span aria-hidden="true">+</span>
          </Button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="border-b border-dashed border-[#2A2A2E] py-6">
          <Button
            variant="secondary"
            className="h-9 rounded-xl bg-[#141414] px-5 text-[#E8E8E8] hover:bg-[#2A2A2E]"
            onClick={onAdd}
          >
            <span aria-hidden="true">+</span> Add {MEAL_META[mealType].label}
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 transition-colors"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <FoodThumb name={entry.name} category={entry.category} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-[#E8E8E8]">{entry.name}</p>
                  <p className="text-[11px] text-[#9A9A9A]">
                    {formatQty(entry.quantity)} × {entry.servingLabel ?? entry.servingUnit}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs font-medium tabular-nums text-[#9A9A9A]">
                <span>{Math.round(entry.calories).toLocaleString()} kcal</span>
                <span className="hidden sm:inline">
                  {Math.round(entry.proteinG)} P / {Math.round(entry.carbsG)} C /{" "}
                  {Math.round(entry.fatG)} F
                </span>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-[#9A9A9A] transition-colors hover:bg-[#FF453A]/10 hover:text-[#FF453A]"
                  aria-label={`Delete ${entry.name} from ${title}`}
                  onClick={() => setConfirming(entry.id)}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!confirming} onOpenChange={(open) => !open && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this meal?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending
                ? `${pending.name} — ${Math.round(pending.calories).toLocaleString()} kcal will be removed from ${title}. This can\u2019t be undone.`
                : "This can\u2019t be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              className="bg-[#FF453A] text-white hover:bg-[#FF453A]/90"
              onClick={handleConfirm}
            >
              Remove
            </AlertDialogAction>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
