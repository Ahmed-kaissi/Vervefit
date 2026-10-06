import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useTrainingPlan } from "@/hooks/use-training-plan";

const DAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

interface ProgramPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Swap the whole program. Each option shows its weekly rhythm so the choice
 * is a real trade-off (5 days vs 6 vs 3) rather than a name you can't act on.
 */
export function ProgramPicker({ open, onOpenChange }: ProgramPickerProps) {
  const { program, programs, swapCount, selectProgram, resetProgram } =
    useTrainingPlan();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto rounded-t-3xl"
      >
        <SheetHeader>
          <SheetTitle>Choose your split</SheetTitle>
          <SheetDescription>
            Switching starts a clean slate — your exercise substitutions are
            per program.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-2.5 px-4 pb-8">
          {programs.map((p) => {
            const active = p.id === program.id;
            const days = p.week.filter((d) => d !== null).length;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => selectProgram(p.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                  active
                    ? "border-primary/50 bg-primary/8 shadow-glow"
                    : "border-border/70 bg-card hover:border-primary/40",
                )}
              >
                <span className="text-2xl" aria-hidden="true">
                  {p.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">
                      {p.name}
                    </p>
                    {active && (
                      <Check
                        className="size-4 shrink-0 text-primary"
                        aria-label="Current program"
                      />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {p.tagline}
                  </p>
                  <div className="mt-2.5 flex items-center gap-1.5">
                    {p.week.map((d, i) => (
                      <span
                        key={i}
                        title={d === null ? "Rest" : p.sessions[d].name}
                        className={cn(
                          "flex size-6 items-center justify-center rounded-md text-[10px] font-bold",
                          d === null
                            ? "bg-muted/60 text-muted-foreground/50"
                            : "bg-primary/12 text-primary",
                        )}
                      >
                        {DAY_INITIALS[i]}
                      </span>
                    ))}
                    <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {days} day{days === 1 ? "" : "s"}/week
                    </span>
                  </div>
                </div>
              </button>
            );
          })}

          {swapCount > 0 && (
            <Button
              variant="outline"
              className="mt-2 w-full"
              onClick={resetProgram}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset {swapCount} substitution{swapCount === 1 ? "" : "s"}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
