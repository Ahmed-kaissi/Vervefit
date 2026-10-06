import { useEffect, useState } from "react";
import {
  Check,
  Dumbbell,
  Layers,
  Moon,
  Pause,
  Play,
  Shuffle,
  Timer,
  Trash2,
  Undo2,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  burnEstimate,
  useWeightLog,
  useWorkouts,
  type WorkoutExercise,
} from "@/hooks/use-body";
import {
  useTrainingPlan,
  type ResolvedSession,
} from "@/hooks/use-training-plan";
import { ExerciseSwapSheet } from "@/components/vervefit/ExerciseSwapSheet";
import { ExerciseDemo } from "@/components/vervefit/ExerciseDemo";
import { ProgramPicker } from "@/components/vervefit/ProgramPicker";
import { EQUIPMENT_LABELS, GROUP_LABELS, getExercise } from "@/lib/training-plans";
import { exerciseIdByName } from "@/lib/exercise-demos";
import { prettyDate } from "@/lib/nutrition";
import { cn } from "@/lib/utils";

type Active = {
  name: string;
  focus: string;
  programName: string;
  exercises: WorkoutExercise[];
  startedAt: number;
  elapsed: number;
  running: boolean;
};

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function toLoggable(session: ResolvedSession): WorkoutExercise[] {
  return session.exercises.map((e) => ({
    name: e.exercise.name,
    sets: e.sets,
    reps: e.reps ?? undefined,
    weightKg: e.weightKg,
  }));
}

function ExerciseRow({
  name,
  sets,
  reps,
  weightKg,
  group,
  equipment,
  swapped,
  canSwap,
  onOpenSwap,
  exerciseId,
  cue,
  demoOpen,
  onToggleDemo,
}: {
  name: string;
  sets: number;
  reps: number | null;
  weightKg?: number;
  group: string;
  equipment: string;
  swapped: boolean;
  canSwap: boolean;
  onOpenSwap: () => void;
  exerciseId: string;
  cue: string;
  demoOpen: boolean;
  onToggleDemo: () => void;
}) {
  return (
    <li className={cn("rounded-xl", swapped ? "bg-accent/15" : "bg-muted/50")}>
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-xs font-semibold",
              swapped ? "text-accent-foreground" : "text-foreground",
            )}
          >
            {name}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {group} · {equipment}
          </p>
        </div>
        <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
          {sets} × {reps ?? "—"}
          {weightKg ? ` @ ${weightKg}kg` : ""}
        </span>
        <button
          type="button"
          onClick={onToggleDemo}
          aria-expanded={demoOpen}
          aria-label={demoOpen ? `Hide how to do ${name}` : `Show how to do ${name}`}
          className={cn(
            "shrink-0 rounded-lg p-1.5 transition-colors",
            demoOpen
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
          )}
        >
          {demoOpen ? (
            <X className="size-3.5" aria-hidden="true" />
          ) : (
            <Play className="size-3.5" aria-hidden="true" />
          )}
        </button>
        {canSwap && (
          <button
            type="button"
            onClick={onOpenSwap}
            aria-label={`Swap ${name} for another exercise`}
            className={cn(
              "shrink-0 rounded-lg p-1.5 transition-colors",
              swapped
                ? "bg-accent/25 text-accent-foreground"
                : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
            )}
          >
            {swapped ? (
              <Undo2 className="size-3.5" aria-hidden="true" />
            ) : (
              <Shuffle className="size-3.5" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {demoOpen && (
        <div className="px-2 pb-2">
          <ExerciseDemo
            exerciseId={exerciseId}
            name={name}
            cue={cue}
            chips={[`${sets} × ${reps ?? "—"}`, group]}
          />
        </div>
      )}
    </li>
  );
}

/** Sticky ribbon shown while a session is live: timer, live kcal, current exercise. */
function LiveSessionRibbon({
  name,
  focus,
  programName,
  elapsed,
  running,
  burn,
  onPauseResume,
  onFinish,
  activeDemoIndex,
  activeExercises,
  onSwitchDemoIndex,
  activeExerciseId,
  activeCue,
}: {
  name: string;
  focus: string;
  programName: string;
  elapsed: number;
  running: boolean;
  burn: ReturnType<typeof burnEstimate> | null;
  onPauseResume: () => void;
  onFinish: () => void;
  activeDemoIndex: number;
  activeExercises: WorkoutExercise[];
  onSwitchDemoIndex: (i: number) => void;
  activeExerciseId?: string;
  activeCue?: string;
}) {
  return (
    <section className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-30 rounded-2xl border border-primary/30 bg-card p-5 shadow-card shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            In progress
          </p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-foreground">
            {name}
          </h2>
          <p className="text-xs font-medium text-muted-foreground">
            {focus} · {programName}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="secondary"
            className="rounded-xl"
            onClick={onPauseResume}
          >
            {running ? (
              <>
                <Pause className="size-4" aria-hidden="true" /> Pause
              </>
            ) : (
              <>
                <Play className="size-4" aria-hidden="true" /> Resume
              </>
            )}
          </Button>
          <Button type="button" className="rounded-xl" onClick={onFinish}>
            <Check className="size-4" aria-hidden="true" /> Finish
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center gap-1 rounded-2xl bg-primary/8 py-6">
        <Timer className="size-5 text-primary" aria-hidden="true" />
        <p className="text-4xl font-extrabold tabular-nums tracking-tight text-foreground">
          {formatDuration(elapsed)}
        </p>
        <p className="text-xs font-medium text-muted-foreground">
          ~{burn?.calories ?? 0} kcal burned
          {burn && !burn.personalWeight && (
            <span className="ml-1 font-normal text-muted-foreground/80">
              {" "}
              (generic estimate — log your weight for a personal one)
            </span>
          )}
        </p>
      </div>

      {activeExercises.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Current exercise
          </p>
          <div className="rounded-xl bg-muted/50 p-2">
            {activeExercises[activeDemoIndex] ? (
              <div className="flex items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Play className="size-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {activeExercises[activeDemoIndex].name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {activeExercises[activeDemoIndex].sets} ×{" "}
                    {activeExercises[activeDemoIndex].reps ?? "—"}
                    {activeExercises[activeDemoIndex].weightKg ? ` @ ${activeExercises[activeDemoIndex].weightKg}kg` : ""}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-2 flex gap-1.5">
            {activeExercises.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSwitchDemoIndex(i)}
                aria-pressed={i === activeDemoIndex}
                className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold transition-colors ${i === activeDemoIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/** Guided training driven by the chosen program. */
export function TrainingCard() {
  const { sessions, totalMinutes, trainedToday, logSession, removeSession } =
    useWorkouts(7);
  const { latest: latestWeight } = useWeightLog(120);
  const {
    program,
    week,
    todaysSession,
    sessionByIndex,
    isRestDay,
    swapCount,
    swapExercise,
    restoreExercise,
  } = useTrainingPlan();

  const [active, setActive] = useState<Active | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [programOpen, setProgramOpen] = useState(false);
  const [swapSessionIndex, setSwapSessionIndex] = useState<number | null>(null);
  const [swapFocusId, setSwapFocusId] = useState<string | null>(null);
  const [demoId, setDemoId] = useState<string | null>(null);
  const [demoIndex, setDemoIndex] = useState(0);

  useEffect(() => {
    if (!active?.running) return;
    const id = window.setInterval(() => {
      setActive((prev) =>
        prev
          ? { ...prev, elapsed: Math.floor((Date.now() - prev.startedAt) / 1000) }
          : prev,
      );
    }, 1000);
    return () => window.clearInterval(id);
  }, [active?.running]);

  const start = (session: ResolvedSession) => {
    setActive({
      name: session.name,
      focus: session.focus,
      programName: program.name,
      exercises: toLoggable(session),
      startedAt: Date.now(),
      elapsed: 0,
      running: true,
    });
    setDemoIndex(0);
  };

  const finish = async () => {
    if (!active) return;
    const minutes = Math.max(1, Math.round(active.elapsed / 60));
    await logSession({
      name: active.name,
      focus: active.focus,
      minutes,
      exercises: active.exercises,
    });
    setActive(null);
  };

  const activeBurn = active
    ? burnEstimate(
        active.focus,
        Math.max(1, Math.round(active.elapsed / 60)),
        latestWeight?.kg ?? null,
      )
    : null;

  const DAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  const activeExercise = active?.exercises[demoIndex] ?? active?.exercises[0] ?? null;
  const activeExerciseId = activeExercise
    ? exerciseIdByName(activeExercise.name)
    : undefined;
  const activeCue = activeExerciseId ? getExercise(activeExerciseId).cue : undefined;

  if (active) {
    return (
      <>
        <LiveSessionRibbon
          name={active.name}
          focus={active.focus}
          programName={active.programName}
          elapsed={active.elapsed}
          running={active.running}
          burn={activeBurn}
          onPauseResume={() =>
            setActive((prev) =>
              prev ? { ...prev, running: !prev.running } : prev,
            )
          }
          onFinish={finish}
          activeDemoIndex={demoIndex}
          activeExercises={active.exercises}
          onSwitchDemoIndex={(i) => setDemoIndex(i)}
          activeExerciseId={activeExerciseId}
          activeCue={activeCue}
        />

        <section className="rounded-2xl border border-primary/30 bg-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            In progress
          </p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-foreground">
            {active.name}
          </h2>
          <p className="text-xs font-medium text-muted-foreground">
            {active.focus} · {program.name}
          </p>

          {activeExercise && (
            <div className="mb-5">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                How it&rsquo;s done
              </p>
              <ExerciseDemo
                exerciseId={activeExerciseId}
                name={activeExercise.name}
                cue={activeCue}
                chips={[`${activeExercise.sets} × ${activeExercise.reps ?? "—"}`]}
              />
            </div>
          )}

          <ul className="mb-5 space-y-1.5">
            {active.exercises.map((ex, i) => (
              <li key={`${ex.name}-${i}`}>
                <button
                  type="button"
                  onClick={() => setDemoIndex(i)}
                  aria-pressed={i === demoIndex}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors",
                    i === demoIndex
                      ? "bg-primary/12 ring-1 ring-primary/30"
                      : "bg-muted/50 hover:bg-muted/80",
                  )}
                >
                  <span className="min-w-0 truncate font-medium text-foreground">
                    {ex.name}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {ex.sets} × {ex.reps ?? "—"}
                    {ex.weightKg ? ` @ ${ex.weightKg}kg` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() =>
                setActive((prev) =>
                  prev ? { ...prev, running: !prev.running } : prev,
                )
              }
            >
              {active.running ? (
                <>
                  <Pause className="size-4" aria-hidden="true" /> Pause
                </>
              ) : (
                <>
                  <Play className="size-4" aria-hidden="true" /> Resume
                </>
              )}
            </Button>
            <Button className="flex-1" onClick={finish}>
              <Check className="size-4" aria-hidden="true" /> Finish
            </Button>
          </div>
        </section>
      </>
    );
  }

  const renderExercises = (session: ResolvedSession) => (
    <ul className="space-y-1.5">
      {session.exercises.map((e) => (
        <ExerciseRow
          key={`${session.sessionIndex}-${e.originalId}`}
          name={e.exercise.name}
          sets={e.sets}
          reps={e.reps}
          weightKg={e.weightKg}
          group={GROUP_LABELS[e.exercise.group]}
          equipment={EQUIPMENT_LABELS[e.exercise.equipment]}
          swapped={e.swapped}
          canSwap
          exerciseId={e.id}
          cue={e.exercise.cue}
          demoOpen={demoId === e.id}
          onToggleDemo={() =>
            setDemoId((prev) => (prev === e.id ? null : e.id))
          }
          onOpenSwap={() => {
            setSwapSessionIndex(session.sessionIndex);
            setSwapFocusId(e.originalId);
          }}
        />
      ))}
    </ul>
  );

  return (
    <>
      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-card">
        <header className="mb-4 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Dumbbell className="size-4" aria-hidden="true" />
            </span>
            Today
          </h2>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-bold",
              trainedToday
                ? "bg-primary/12 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {trainedToday ? "Trained today" : `${totalMinutes} min this week`}
          </span>
        </header>

        {isRestDay || !todaysSession ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background p-6 text-center">
            <span className="mx-auto flex size-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Moon className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-bold text-foreground">Rest day</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
              {program.name} leaves today off so you can recover. Pick a
              session below if you want to train anyway.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-primary/8 p-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl" aria-hidden="true">
                  {todaysSession.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-extrabold tracking-tight text-foreground">
                    {todaysSession.name}
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {todaysSession.focus} · {todaysSession.minutes} min ·{" "}
                    {todaysSession.exercises.length} exercises
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3">{renderExercises(todaysSession)}</div>

            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Play className="size-3.5" aria-hidden="true" />
              Tap play on an exercise for a form demo, or shuffle to swap it
              {swapCount > 0 ? ` · ${swapCount} swapped` : ""}
            </p>

            <Button className="mt-4 w-full" onClick={() => start(todaysSession)}>
              <Play className="size-4" aria-hidden="true" />
              Start {todaysSession.name}
            </Button>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-card">
        <header className="mb-4 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="size-4" aria-hidden="true" />
            </span>
            Your program
          </h2>
          <Button
            variant="secondary"
            size="sm"
            className="h-8 rounded-full"
            onClick={() => setProgramOpen(true)}
          >
            Change split
          </Button>
        </header>

        <p className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <span className="text-lg" aria-hidden="true">
            {program.icon}
          </span>
          {program.name}
        </p>

        <ul className="grid grid-cols-7 gap-1.5">
          {week.map((day, i) => (
            <li
              key={i}
              className={cn(
                "rounded-xl border px-1 py-2 text-center",
                day ? "border-primary/25 bg-primary/8" : "border-border/60 bg-muted/40",
                i === todayIdx && "ring-2 ring-primary/60",
              )}
            >
              <p
                className={cn(
                  "text-[9px] font-bold uppercase tracking-wide",
                  day ? "text-primary" : "text-muted-foreground/60",
                )}
              >
                {DAY_INITIALS[i]}
              </p>
              <p className="mt-1 text-base leading-none" aria-hidden="true">
                {day ? day.session.icon : "·"}
              </p>
              <p className="mt-1 truncate text-[9px] font-medium text-muted-foreground">
                {day ? day.session.name.split(" ")[0] : "Rest"}
              </p>
            </li>
          ))}
        </ul>

        <ul className="mt-3 space-y-1.5">
          {week
            .filter((d) => d !== null)
            .map((d) => (
              <li
                key={d!.day}
                className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => start(d!.session)}
                  className="group flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="text-sm" aria-hidden="true">
                    {d!.session.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-foreground">
                      {DAY_INITIALS[d!.day]} · {d!.session.name}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      {d!.session.minutes} min · {d!.session.exercises.length}{" "}
                      exercises
                      {d!.session.exercises.some((e) => e.swapped) && " · swapped"}
                    </span>
                  </span>
                  <Play
                    className="ml-auto size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSwapSessionIndex(d!.sessionIndex);
                    setSwapFocusId(null);
                  }}
                  aria-label={`Swap an exercise in ${d!.session.name}`}
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  <Shuffle className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
        </ul>
      </section>

      {sessions.length > 0 && (
        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Recent sessions
          </h2>
          <ul className="space-y-2">
            {sessions.slice(0, 5).map((session) => (
              <li
                key={session.id}
                className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2.5"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Zap className="size-4" aria-hidden="true" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {session.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {prettyDate(session.date)} · {session.minutes} min
                    {session.calories ? ` · ${session.calories} kcal` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingDelete(session.id)}
                  aria-label={`Delete ${session.name} session`}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ProgramPicker open={programOpen} onOpenChange={setProgramOpen} />

      <ExerciseSwapSheet
        key={`${swapSessionIndex}-${swapFocusId}`}
        open={swapSessionIndex !== null}
        onOpenChange={(o) => {
          if (!o) setSwapSessionIndex(null);
        }}
        session={
          swapSessionIndex === null ? null : sessionByIndex(swapSessionIndex)
        }
        focusId={swapFocusId}
        onSwap={(originalId, replacementId) => {
          if (swapSessionIndex === null) return;
          swapExercise(swapSessionIndex, originalId, replacementId);
        }}
        onRestore={(originalId) => {
          if (swapSessionIndex === null) return;
          restoreExercise(swapSessionIndex, originalId);
        }}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be removed from your training minutes and progress charts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete) void removeSession(pendingDelete);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
