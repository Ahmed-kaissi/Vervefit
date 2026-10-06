import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useHabits } from "@/hooks/use-habits";
import { cn } from "@/lib/utils";

const ICON_CHOICES = ["💧", "🚶", "💪", "😴", "📚", "🧘", "🚴", "🥗"];

/** Daily habit checklist with inline add and confirm-to-delete. */
export function HabitsList() {
  const { habits, doneToday, toggleHabit, addHabit, removeHabit, isGuest } =
    useHabits();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICON_CHOICES[0]);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await addHabit(trimmed, icon);
    setName("");
  };

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-card">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Daily habits</h2>
        <span className="text-xs font-medium text-muted-foreground">
          {habits.length} tracked
        </span>
      </header>

      {habits.length > 0 && (
        <ul className="mb-5 space-y-2">
          {habits.map((habit) => {
            const done = doneToday.has(habit.id);
            return (
              <li
                key={habit.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 transition-colors",
                  done
                    ? "border-primary/30 bg-primary/8"
                    : "border-border/70 bg-background",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleHabit(habit.id)}
                  aria-pressed={done}
                  aria-label={`Mark ${habit.name} as ${done ? "not done" : "done"}`}
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/60",
                  )}
                >
                  {done && <Check className="size-4" aria-hidden="true" />}
                </button>

                <span className="text-lg" aria-hidden="true">
                  {habit.icon ?? "✅"}
                </span>

                <span
                  className={cn(
                    "flex-1 text-sm font-medium",
                    done ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {habit.name}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPendingDelete({ id: habit.id, label: habit.name })
                  }
                  aria-label={`Delete ${habit.name}`}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">
          Add a habit
        </p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {ICON_CHOICES.map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => setIcon(choice)}
              aria-pressed={icon === choice}
              aria-label={`Use icon ${choice}`}
              className={cn(
                "flex size-8 items-center justify-center rounded-lg text-base transition-colors",
                icon === choice
                  ? "bg-primary/15 ring-2 ring-primary/50"
                  : "bg-background hover:bg-muted",
              )}
            >
              {choice}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            placeholder="e.g. Stretch for 10 minutes"
            className="h-10"
            maxLength={60}
          />
          <Button type="button" onClick={submit} disabled={!name.trim()}>
            <Plus className="size-4" aria-hidden="true" />
            Add
          </Button>
        </div>
        {isGuest && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Saved in this browser — create an account to keep them.
          </p>
        )}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this habit?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `“${pendingDelete.label}” and its history will be removed. This can't be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete) void removeHabit(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
