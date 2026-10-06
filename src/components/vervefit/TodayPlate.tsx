import { useState } from "react";
import { Camera, Plus } from "lucide-react";
import { FoodThumb } from "@/components/vervefit/FoodThumb";
import { MEAL_IDEAS } from "@/lib/food-media";
import { MEAL_META } from "@/lib/nutrition";
import type { MealEntry, MealType } from "@/lib/nutrition";
import { cn } from "@/lib/utils";

interface Props {
  /** Today's logged entries, newest state. */
  entries: MealEntry[];
  /** Opens the add-food sheet on the given section. */
  onAdd: (meal: MealType) => void;
}

/** A decorative plate photo, used on the empty state. Tapping opens the sheet. */
function IdeaCard({
  idea,
  onAdd,
}: {
  idea: (typeof MEAL_IDEAS)[number];
  onAdd: (meal: MealType) => void;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onAdd(idea.meal)}
      className="group relative h-28 w-40 shrink-0 overflow-hidden rounded-2xl border border-[#2A2A2E] bg-[#141414] text-left shadow-card transition-transform active:scale-[0.98] hover:-translate-y-0.5"
      aria-label={`Log a ${MEAL_META[idea.meal].label.toLowerCase()} similar to ${idea.title}`}
    >
      {!failed ? (
        <img
          src={idea.image}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <span className="flex size-full items-center justify-center text-4xl" aria-hidden="true">
          {MEAL_META[idea.meal].icon}
        </span>
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" aria-hidden="true" />
      <span className="absolute inset-x-0 bottom-0 p-2.5">
        <span className="block truncate text-xs font-bold text-[#E8E8E8]">
          {idea.title}
        </span>
        <span className="block truncate text-[10px] font-medium text-[#9A9A9A]/75">
          {MEAL_META[idea.meal].label} · {idea.hint}
        </span>
      </span>
    </button>
  );
}

/** The photo strip under the calorie hero. */
export function TodayPlate({ entries, onAdd }: Props) {
  const hasEntries = entries.length > 0;
  const recent = [...entries].sort((a, b) => b.loggedAt - a.loggedAt);

  return (
    <section aria-label={hasEntries ? "On your plate today" : "Meal ideas"}>
      <header className="mb-2.5 flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-[#E8E8E8]">
          <Camera className="size-3.5 text-[#CEFF00]" aria-hidden="true" />
          {hasEntries ? "On your plate" : "Meal ideas"}
        </h2>
        <span className="text-[11px] font-medium text-[#9A9A9A]">
          {hasEntries
            ? `${entries.length} ${entries.length === 1 ? "photo" : "photos"} logged`
            : "Tap a plate to start logging"}
        </span>
      </header>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {hasEntries
          ? recent.map((entry) => (
              <article
                key={entry.id}
                className="w-32 shrink-0 rounded-2xl border border-[#2A2A2E] bg-[#141414] p-2 shadow-card"
              >
                <FoodThumb
                  name={entry.name}
                  category={entry.category}
                  size="hero"
                  className="aspect-[4/3]"
                />
                <p className="mt-2 truncate text-[11px] font-semibold text-[#E8E8E8]">
                  {entry.name}
                </p>
                <p className="truncate text-[10px] font-medium text-[#9A9A9A]">
                  {MEAL_META[entry.mealType].icon} {Math.round(entry.calories).toLocaleString()} kcal
                </p>
              </article>
            ))
          : MEAL_IDEAS.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} onAdd={onAdd} />
            ))}

        {hasEntries && (
          <button
            type="button"
            onClick={() => onAdd("snack")}
            className={cn(
              "flex w-32 shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[#2A2A2E] bg-[#1A1A1C] p-2 text-[#9A9A9A] transition-colors",
              "hover:border-[#CEFF00]/50 hover:text-[#CEFF00]",
            )}
            aria-label="Log another food"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-[#CEFF00]/10 text-[#CEFF00]">
              <Plus className="size-4" aria-hidden="true" />
            </span>
            <span className="text-[11px] font-semibold">Log another</span>
          </button>
        )}
      </div>
    </section>
  );
}
