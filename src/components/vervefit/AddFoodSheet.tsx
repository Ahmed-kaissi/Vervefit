import { useMemo, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus, Search, Star, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { FoodItem, MealType } from "@/lib/nutrition";
import { MEAL_META, MEAL_ORDER } from "@/lib/nutrition";
import { FOOD_DATABASE } from "@/lib/food-database";
import { FoodThumb } from "@/components/vervefit/FoodThumb";
import type { FoodSearchResult } from "@/hooks/use-food-log";

const CATEGORIES = [
  "Protein",
  "Carbs",
  "Fruit",
  "Vegetables",
  "Dairy",
  "Nuts & Fats",
  "Beverages",
  "Snacks",
] as const;

type Category = (typeof CATEGORIES)[number] | "All";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMealType: MealType;
  /** Logged to the correct local day — never UTC. */
  date: string;
  addEntry: (
    food: FoodSearchResult,
    mealType: MealType,
    date: string,
    quantity: number,
  ) => Promise<void>;
}

const STEP = 0.5;
const MIN_QTY = 0.5;
const MAX_QTY = 20;

function num(value: string, fallback = 0): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

export function AddFoodSheet({
  open,
  onOpenChange,
  initialMealType,
  date,
  addEntry,
}: Props) {
  const [tab, setTab] = useState<"browse" | "custom">("browse");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [mealType, setMealType] = useState<MealType>(initialMealType);

  const [customName, setCustomName] = useState("");
  const [customCalories, setCustomCalories] = useState("0");
  const [customProtein, setCustomProtein] = useState("0");
  const [customCarbs, setCustomCarbs] = useState("0");
  const [customFat, setCustomFat] = useState("0");
  const [customServingLabel, setCustomServingLabel] = useState("");

  const [saving, setSaving] = useState(false);
  // State is seeded from initialMealType; the parent remounts this component
  // (via `key`) each time the sheet opens, so no reset effect is needed.

  const filteredLocal = useMemo(() => {
    const t = query.trim().toLowerCase();
    const matched =
      t === ""
        ? FOOD_DATABASE
        : FOOD_DATABASE.filter(
            (f) =>
              f.name.toLowerCase().includes(t) ||
              (f.servingLabel ?? f.servingUnit).toLowerCase().includes(t),
          );
    const byCat =
      category === "All" ? matched : matched.filter((f) => f.category === category);
    return byCat.slice(0, 40);
  }, [query, category]);

  // Live preview of what will actually be logged.
  const preview = useMemo(() => {
    if (tab === "custom") {
      return {
        calories: Math.round(num(customCalories) * quantity),
        proteinG: num(customProtein) * quantity,
        carbsG: num(customCarbs) * quantity,
        fatG: num(customFat) * quantity,
      };
    }
    if (!selected) return null;
    return {
      calories: Math.round(selected.calories * quantity),
      proteinG: selected.proteinG * quantity,
      carbsG: selected.carbsG * quantity,
      fatG: selected.fatG * quantity,
    };
  }, [tab, selected, quantity, customCalories, customProtein, customCarbs, customFat]);

  const stepQty = (delta: number) =>
    setQuantity((q) => {
      const next = Math.round((q + delta) * 10) / 10;
      return Math.min(MAX_QTY, Math.max(MIN_QTY, next));
    });

  const handleAdd = async () => {
    const q = Math.round(quantity * 10) / 10;
    setSaving(true);
    try {
      if (tab === "custom") {
        const name = customName.trim();
        if (!name) return;
        await addEntry(
          {
            name,
            category: "Other",
            servingSize: 1,
            servingUnit: "serving",
            servingLabel: customServingLabel.trim() || "1 serving",
            calories: num(customCalories),
            proteinG: num(customProtein),
            carbsG: num(customCarbs),
            fatG: num(customFat),
          },
          mealType,
          date,
          q,
        );
      } else if (selected) {
        await addEntry(selected, mealType, date, q);
      } else {
        return;
      }
      onOpenChange(false);
    } catch (err) {
      // The sheet stays open with the user's input intact so the click is not
      // silently swallowed — logging a meal must never fail invisibly.
      console.error("[AddFoodSheet] failed to log entry:", err);
      toast.error(
        err instanceof Error && err.message
          ? `Couldn't add that: ${err.message}`
          : "Couldn't add that to your log. Check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const canAdd = tab === "custom" ? customName.trim().length > 0 : selected !== null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh] overflow-hidden">
        <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col px-4">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Add food to {MEAL_META[mealType].label}</DrawerTitle>
            <DrawerDescription>
              Search the food database or add a custom item with calories and macros.
            </DrawerDescription>
          </DrawerHeader>

          {/* Tabs */}
          <div className="flex shrink-0 gap-1.5 border-b border-border/60">
            {(["browse", "custom"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={cn(
                  "flex-1 py-3 text-sm font-semibold transition-colors",
                  tab === t
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setTab(t)}
              >
                {t === "browse" ? "Browse foods" : "Add custom"}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pb-4 pt-4">
            {tab === "browse" ? (
              <>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search foods, e.g. chicken breast..."
                    className="pl-9"
                    autoFocus
                    aria-label="Search foods"
                  />
                  {query && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
                      onClick={() => setQuery("")}
                      aria-label="Clear search"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>

                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {(["All", ...CATEGORIES] as Category[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={cn(
                        "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                        category === cat
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80",
                      )}
                      onClick={() => setCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <ul className="mt-3 space-y-1 pr-1">
                  {filteredLocal.map((food) => (
                    <li key={food.name}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors",
                          selected?.name === food.name
                            ? "bg-primary/10"
                            : "hover:bg-primary/6",
                        )}
                        onClick={() => setSelected(food)}
                      >
                        <FoodThumb
                          name={food.name}
                          category={food.category}
                          size="sm"
                        />
                        <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                          {food.name}
                        </span>
                        <span className="whitespace-nowrap pl-2 font-semibold text-foreground/80">
                          {food.calories} kcal
                        </span>
                      </button>
                    </li>
                  ))}
                  {filteredLocal.length === 0 && (
                    <li className="py-6 text-center text-sm text-muted-foreground">
                      No foods match &ldquo;{query}&rdquo;. Try the Add custom tab.
                    </li>
                  )}
                </ul>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <FoodThumb name={customName || "Meal"} category="Other" size="sm" />
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="custom-name">Food name</Label>
                    <Input
                      id="custom-name"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. Homemade Oatmeal"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="custom-cal">Calories</Label>
                    <Input
                      id="custom-cal"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={customCalories}
                      onChange={(e) => setCustomCalories(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="custom-pro">Protein (g)</Label>
                    <Input
                      id="custom-pro"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={customProtein}
                      onChange={(e) => setCustomProtein(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="custom-carb">Carbs (g)</Label>
                    <Input
                      id="custom-carb"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={customCarbs}
                      onChange={(e) => setCustomCarbs(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="custom-fat">Fat (g)</Label>
                    <Input
                      id="custom-fat"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={customFat}
                      onChange={(e) => setCustomFat(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="custom-serving">Serving label</Label>
                  <Input
                    id="custom-serving"
                    value={customServingLabel}
                    onChange={(e) => setCustomServingLabel(e.target.value)}
                    placeholder="e.g. 1 cup, 1 slice"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter macros for one serving, then set the quantity below.
                </p>
              </div>
            )}
          </div>

          {/* Quantity + meal type + submit. This row is pinned to the bottom of
              the sheet so the primary action is always reachable, however long
              the food list above grows. */}
          <div className="flex shrink-0 flex-col gap-3 border-t border-border/60 bg-background pb-6 pt-4">
            {tab === "browse" && selected && (
              <figure className="flex items-center gap-3">
                <FoodThumb
                  name={selected.name}
                  category={selected.category}
                  size="sm"
                  className="shadow-card"
                />
                <figcaption className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">
                    {selected.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selected.servingLabel ?? selected.servingUnit}
                  </p>
                </figcaption>
              </figure>
            )}

            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-muted-foreground">Quantity</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => stepQty(-STEP)}
                  disabled={quantity <= MIN_QTY}
                  aria-label="Decrease quantity"
                >
                  <Minus className="size-3" />
                </Button>
                <span className="w-12 text-center text-sm font-semibold tabular-nums">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => stepQty(STEP)}
                  disabled={quantity >= MAX_QTY}
                  aria-label="Increase quantity"
                >
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>

            {preview && (
              <p className="text-center text-xs text-muted-foreground">
                <Star className="mr-1 inline size-3" aria-hidden="true" />
                {Math.round(preview.calories).toLocaleString()} kcal ·{" "}
                {Math.round(preview.proteinG)}P / {Math.round(preview.carbsG)}C /{" "}
                {Math.round(preview.fatG)}F
              </p>
            )}

            <div className="flex gap-2 overflow-x-auto pb-1">
              {MEAL_ORDER.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors",
                    mealType === m
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                  onClick={() => setMealType(m)}
                >
                  <span className="text-base" aria-hidden="true">
                    {MEAL_META[m].icon}
                  </span>
                  {MEAL_META[m].label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                className="h-11 flex-1 rounded-xl font-semibold shadow-glow"
                onClick={handleAdd}
                disabled={!canAdd || saving}
              >
                {saving
                  ? "Adding…"
                  : `Add to ${MEAL_META[mealType].label}`}
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
