import { useEffect, useState } from "react";
import { Dumbbell, Gauge, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  demoFrames,
  demoFramesByName,
  levelLabel,
  loadExerciseDetail,
  muscleLabel,
  type ExerciseDetail,
} from "@/lib/exercise-demos";

/** Frame dwell time at 1× and 0.5×. */
const PERIOD_MS = 1000;
const SLOW_PERIOD_MS = 2000;

interface Props {
  /** Preferred: the library id, so the demo survives a rename. */
  exerciseId?: string;
  name: string;
  /** Our own written cue — the fallback when the dataset has no notes. */
  cue?: string;
  /** Extra chips (equipment, prescribed sets/reps) from the caller. */
  chips?: string[];
  className?: string;
  autoPlay?: boolean;
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The mini window that shows how an exercise is done.
 *
 * The dataset gives two photos per movement — start and end position — so the
 * "player" is those two frames cross-fading on a loop, with a scrub bar that
 * walks the range of motion by hand. The written form notes load behind it and
 * fill in when they arrive; if they never do, the exercise's own cue stands in.
 */
export function ExerciseDemo({
  exerciseId,
  name,
  cue,
  chips,
  className,
  autoPlay = true,
}: Props) {
  const frames = exerciseId ? demoFrames(exerciseId) : demoFramesByName(name);
  const startSrc = frames?.start;
  const endSrc = frames?.end;

  // Playback state is stamped with the movement it belongs to, so switching
  // exercises starts from the first frame without a resetting effect.
  const demoKey = exerciseId ?? name;

  const [playback, setPlayback] = useState<{ key: string; phase: 0 | 1 }>({
    key: demoKey,
    phase: 0,
  });
  const [scrubState, setScrubState] = useState<{
    key: string;
    value: number;
  } | null>(null);
  const [slow, setSlow] = useState(false);
  const [playing, setPlaying] = useState(() => autoPlay && !prefersReducedMotion());
  // Stamped the same way: `undefined` means still loading, `null` means the
  // dataset has nothing for this movement.
  const [detailState, setDetailState] = useState<{
    key: string;
    value: ExerciseDetail | null;
  } | null>(null);

  const phase = playback.key === demoKey ? playback.phase : 0;
  const scrub = scrubState?.key === demoKey ? scrubState.value : null;
  const detail = !exerciseId
    ? null
    : detailState?.key === demoKey
      ? detailState.value
      : undefined;

  useEffect(() => {
    if (!playing || !startSrc) return;
    const id = window.setInterval(
      () =>
        setPlayback((prev) => {
          const current = prev.key === demoKey ? prev.phase : 0;
          return { key: demoKey, phase: current === 0 ? 1 : 0 };
        }),
      slow ? SLOW_PERIOD_MS : PERIOD_MS,
    );
    return () => window.clearInterval(id);
  }, [playing, slow, startSrc, demoKey]);

  useEffect(() => {
    if (!exerciseId) return;
    let cancelled = false;
    loadExerciseDetail(exerciseId).then((value) => {
      if (!cancelled) setDetailState({ key: exerciseId, value });
    });
    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  // Dragging the scrub bar takes over from the loop.
  const progress = scrub ?? (phase === 1 ? 1 : 0);

  const muscleChips = detail
    ? [
        levelLabel(detail.level),
        ...detail.primaryMuscles.map(muscleLabel),
        ...detail.secondaryMuscles.slice(0, 1).map((m) => `${muscleLabel(m)} (assist)`),
      ]
    : [];
  const allChips = [...(chips ?? []), ...muscleChips];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card",
        className,
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-white">
        {startSrc && endSrc ? (
          <>
            <img
              src={startSrc}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 size-full object-cover"
            />
            <img
              src={endSrc}
              alt=""
              loading="lazy"
              decoding="async"
              style={{ opacity: progress }}
              className="absolute inset-0 size-full object-cover transition-opacity duration-500 ease-in-out"
            />

            <span className="absolute left-2 top-2 rounded-full bg-foreground/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-background backdrop-blur-md">
              Form demo
            </span>
            <span className="absolute right-2 top-2 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground backdrop-blur-md">
              {progress > 0.5 ? "End position" : "Start position"}
            </span>

            {!playing && scrub === null && (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                aria-label={`Play the ${name} form demo`}
                className="absolute inset-0 flex items-center justify-center bg-foreground/10 transition-colors hover:bg-foreground/15"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-background/90 text-primary shadow-lift">
                  <Play className="size-5 translate-x-px" aria-hidden="true" />
                </span>
              </button>
            )}
          </>
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 bg-surface-gradient px-6 text-center">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Dumbbell className="size-5" aria-hidden="true" />
            </span>
            <p className="text-xs font-bold text-foreground">
              No form photos for this movement
            </p>
            <p className="max-w-xs text-[11px] leading-relaxed text-muted-foreground">
              {cue ?? "Work from the cues below and keep the tempo controlled."}
            </p>
          </div>
        )}
      </div>

      {/* Transport */}
      <div className="flex items-center gap-2 border-t border-border/70 px-2.5 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 rounded-full text-primary hover:bg-primary/10"
          onClick={() => {
            setScrubState(null);
            setPlaying((p) => !p);
          }}
          disabled={!startSrc}
          aria-label={playing ? `Pause the ${name} demo` : `Play the ${name} demo`}
        >
          {playing ? (
            <Pause className="size-4" aria-hidden="true" />
          ) : (
            <Play className="size-4" aria-hidden="true" />
          )}
        </Button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={progress}
          disabled={!startSrc}
          onChange={(e) => {
            setPlaying(false);
            setScrubState({ key: demoKey, value: Number(e.target.value) });
          }}
          aria-label={`Scrub through the ${name} range of motion`}
          className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-primary disabled:cursor-not-allowed"
        />

        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 rounded-full px-2 text-[11px] font-bold text-muted-foreground hover:text-primary"
          onClick={() => setSlow((s) => !s)}
          disabled={!startSrc}
          aria-pressed={slow}
        >
          <Gauge className="mr-1 size-3.5" aria-hidden="true" />
          {slow ? "0.5×" : "1×"}
        </Button>
      </div>

      {/* Form notes */}
      <div className="space-y-3 border-t border-border/70 px-3.5 py-3">
        {allChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground"
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        {detail === undefined ? (
          <div className="space-y-2" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-3 animate-pulse rounded-full bg-muted"
                style={{ width: `${100 - i * 14}%` }}
              />
            ))}
          </div>
        ) : detail === null ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {cue ?? "Keep the reps slow and stop a rep or two short of failure."}
          </p>
        ) : (
          <ol className="space-y-2">
            {detail.instructions.map((step, i) => (
              <li key={step} className="flex gap-2.5 text-xs leading-relaxed text-muted-foreground">
                <span className="mt-px flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[9px] font-bold text-primary">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        )}

        {cue && detail !== null && (
          <p className="flex items-start gap-1.5 rounded-xl bg-primary/8 px-2.5 py-2 text-[11px] font-medium leading-relaxed text-foreground">
            <RotateCcw className="mt-px size-3.5 shrink-0 text-primary" aria-hidden="true" />
            {cue}
          </p>
        )}
      </div>
    </div>
  );
}
