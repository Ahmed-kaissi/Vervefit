import { useMemo, useState } from "react";
import {
  Check,
  Dumbbell,
  Play,
  RotateCcw,
  Search,
  Shuffle,
  Undo2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  alternativesFor,
  EQUIPMENT_LABELS,
  getExercise,
  GROUP_LABELS,
  type Equipment,
} from "@/lib/training-plans";
import { ExerciseDemo } from "@/components/vervefit/ExerciseDemo";
import type { ResolvedSession } from "@/hooks/use-training-plan";

interface ExerciseSwapSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The session being edited, with swaps already applied. */
  session: ResolvedSession | null;
  /** A specific exercise to swap; null means "let me pick which one". */
  focusId: string | null;
  onSwap: (originalId: string, replacementId: string) => void;
  onRestore: (originalId: string) => void;
}

const EQUIPMENT_FILTERS: (Equipment | "all")[] = [
  "all",
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "cardio",
];

/**
 * Swap one exercise for another. Two entry points are supported: opening it
 * from an exercise row swaps that exercise straight away, and opening it from
 * a session header asks which one first. Alternatives are ranked by muscle
 * group, so a bench press offers every other chest press before a core move.
 */
export function ExerciseSwapSheet({
  open,
  onOpenChange,
  session,
  focusId,
  onSwap,
  onRestore,
}: ExerciseSwapSheetProps) {
  const [query, setQuery] = useState("");
  const [equipment, setEquipment] = useState<Equipment | "all">("all");
  // Set when the user picks from the "which exercise?" step. The parent keys
  // this component on (session, exercise) so opening for something new remounts
  // it and the filters reset without an effect.
  const [picked, setPicked] = useState<string | null>(null);
  // Which replacement's form demo is open, so you can check the movement
  // before committing to it.
  const [previewId, setPreviewId] = useState<string | null>(null);

  const activeId = picked ?? focusId;
  const focus = useMemo(
    () => session?.exercises.find((e) => e.originalId === activeId) ?? null,
    [session, activeId],
  );

  const original = focus ? getExercise(focus.originalId) : null;

  const options = useMemo(() => {
    if (!original) return [];
    const needle = query.trim().toLowerCase();
    return alternativesFor(original.id, 40).filter((e) => {
      if (equipment !== "all" && e.equipment !== equipment) return false;
      if (!needle) return true;
      return (
        e.name.toLowerCase().includes(needle) ||
        GROUP_LABELS[e.group].toLowerCase().includes(needle)
      );
    });
  }, [original, query, equipment]);

  if (!session) return null;

  /* Step 1 — which exercise in this session? */
  if (!focus || !original) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-3xl"
        >
          <SheetHeader>
            <SheetTitle>Swap an exercise</SheetTitle>
            <SheetDescription>
              {session.name} — pick the movement you want a different option
              for.
            </SheetDescription>
          </SheetHeader>

          <ul className="space-y-2 px-4 pb-8">
            {session.exercises.map((e) => (
              <li key={e.originalId}>
                <button
                  type="button"
                  onClick={() => setPicked(e.originalId)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 text-left transition-colors hover:border-primary/40"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Dumbbell className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-sm font-bold",
                        e.swapped ? "text-accent-foreground" : "text-foreground",
                      )}
                    >
                      {e.exercise.name}
                    </p>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {GROUP_LABELS[e.exercise.group]} ·{" "}
                      {EQUIPMENT_LABELS[e.exercise.equipment]}
                    </p>
                  </div>
                  {e.swapped ? (
                    <Undo2
                      className="size-4 shrink-0 text-accent-foreground"
                      aria-hidden="true"
                    />
                  ) : (
                    <Shuffle
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    );
  }

  /* Step 2 — the replacement. */
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto rounded-t-3xl"
      >
        <SheetHeader>
          <SheetTitle>Swap {original.name}</SheetTitle>
          <SheetDescription>
            {focus.swapped
              ? `Currently doing ${focus.exercise.name}. Showing ${GROUP_LABELS[original.group].toLowerCase()} options first.`
              : `Showing ${GROUP_LABELS[original.group].toLowerCase()} options first. Saved to this session.`}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 px-4 pb-8">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search exercises…"
              aria-label="Search exercises"
              className="h-10 pl-9"
            />
          </div>

          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Play className="size-3.5" aria-hidden="true" />
            Tap play on an option to see how it&rsquo;s done before you swap
          </p>

          <div className="flex flex-wrap gap-1.5">
            {EQUIPMENT_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setEquipment(f)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors",
                  equipment === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {f === "all" ? "All" : EQUIPMENT_LABELS[f]}
              </button>
            ))}
          </div>

          {focus.swapped && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onRestore(focus.originalId);
                onOpenChange(false);
              }}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Put {original.name} back
            </Button>
          )}

          <ul className="space-y-2">
            {options.map((e) => {
              const isActive = e.id === focus.id;
              return (
                <li
                  key={e.id}
                  className={cn(
                    "overflow-hidden rounded-2xl border transition-colors",
                    isActive
                      ? "border-primary/50 bg-primary/8"
                      : "border-border/70 bg-card hover:border-primary/40",
                  )}
                >
                  <div className="flex items-start gap-1 p-3">
                    <button
                      type="button"
                      onClick={() => {
                        onSwap(focus.originalId, e.id);
                        onOpenChange(false);
                      }}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    >
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Dumbbell className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-foreground">
                            {e.name}
                          </p>
                          {isActive && (
                            <Check
                              className="size-3.5 shrink-0 text-primary"
                              aria-label="Currently selected"
                            />
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] font-medium text-primary">
                          {GROUP_LABELS[e.group]} · {EQUIPMENT_LABELS[e.equipment]}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {e.cue}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewId((prev) => (prev === e.id ? null : e.id))
                      }
                      aria-expanded={previewId === e.id}
                      aria-label={
                        previewId === e.id
                          ? `Hide how to do ${e.name}`
                          : `Show how to do ${e.name}`
                      }
                      className={cn(
                        "shrink-0 rounded-lg p-1.5 transition-colors",
                        previewId === e.id
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
                      )}
                    >
                      {previewId === e.id ? (
                        <X className="size-3.5" aria-hidden="true" />
                      ) : (
                        <Play className="size-3.5" aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  {previewId === e.id && (
                    <div className="px-2.5 pb-2.5">
                      <ExerciseDemo
                        exerciseId={e.id}
                        name={e.name}
                        cue={e.cue}
                        chips={[
                          GROUP_LABELS[e.group],
                          EQUIPMENT_LABELS[e.equipment],
                        ]}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {options.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground">
              No{" "}
              {equipment === "all"
                ? ""
                : `${EQUIPMENT_LABELS[equipment].toLowerCase()} `}
              alternative matches “{query}”.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
