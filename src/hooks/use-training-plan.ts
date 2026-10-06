import { useCallback, useMemo, useSyncExternalStore } from "react";
import { PROGRAMS } from "@/lib/training-plans";
import {
  programFor,
  resolveSession,
  trainingPlanStore,
  type PlanState,
  type ResolvedSession,
} from "@/lib/training-plan-store";
import { mondayIndexOf } from "@/convex/lib/dates";

export type { PlanState, ResolvedExercise, ResolvedSession } from "@/lib/training-plan-store";
export { mondayIndexOf };

/**
 * Reads the one shared training plan.
 *
 * Every component that calls this hook sees the same state, so picking a
 * program in the picker immediately updates the training card instead of
 * leaving two independent copies to drift apart.
 */
export function useTrainingPlan(dateInput?: Date) {
  const state: PlanState = useSyncExternalStore(
    trainingPlanStore.subscribe,
    trainingPlanStore.getSnapshot,
    trainingPlanStore.getServerSnapshot,
  );

  const program = useMemo(() => programFor(state), [state]);

  const mondayIndex = mondayIndexOf(dateInput ?? new Date());

  const todaysSession = useMemo<ResolvedSession | null>(() => {
    const idx = program.week[mondayIndex] ?? null;
    if (idx === null) return null;
    return resolveSession(program, idx, state.swaps);
  }, [program, mondayIndex, state.swaps]);

  /** Resolve any session in the program, with the user's swaps applied. */
  const sessionByIndex = useCallback(
    (sessionIndex: number) => resolveSession(program, sessionIndex, state.swaps),
    [program, state.swaps],
  );

  /** The whole week, resolved — used for the plan overview. */
  const week = useMemo(
    () =>
      program.week.map((idx, day) =>
        idx === null
          ? null
          : {
              day,
              sessionIndex: idx,
              session: resolveSession(program, idx, state.swaps),
            },
      ),
    [program, state.swaps],
  );

  const selectProgram = useCallback((programId: string) => {
    trainingPlanStore.selectProgram(programId);
  }, []);

  const swapExercise = useCallback(
    (sessionIndex: number, originalId: string, replacementId: string) => {
      trainingPlanStore.swap(sessionIndex, originalId, replacementId);
    },
    [],
  );

  const restoreExercise = useCallback(
    (sessionIndex: number, originalId: string) => {
      trainingPlanStore.restore(sessionIndex, originalId);
    },
    [],
  );

  const resetProgram = useCallback(() => {
    trainingPlanStore.resetSwaps();
  }, []);

  return {
    program,
    programs: PROGRAMS,
    todaysSession,
    sessionByIndex,
    week,
    swapCount: Object.keys(state.swaps).length,
    isRestDay: todaysSession === null,
    selectProgram,
    swapExercise,
    restoreExercise,
    resetProgram,
  };
}
