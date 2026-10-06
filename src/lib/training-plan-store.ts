import {
  getExercise,
  getProgram,
  type Exercise,
  type PrescribedExercise,
  type Program,
  type Session,
} from "./training-plans";

/**
 * The training plan has exactly one home.
 *
 * Previously `useTrainingPlan` kept a `useState(read())` copy per component,
 * so the program picker and the training card each held their own snapshot and
 * silently disagreed after a program change. Everything now reads and writes
 * this module-level store through `useSyncExternalStore`.
 *
 * The pure helpers below are exported separately so plan resolution can be
 * unit tested without React or a browser.
 */

const KEY = "vervefit-training-plan";
const VERSION = 1;

export interface PlanState {
  programId: string;
  /** `programId|sessionIndex|originalExerciseId` -> substituted exercise id. */
  swaps: Record<string, string>;
  version: 1;
}

export const DEFAULT_PLAN: PlanState = {
  programId: "upperlower",
  swaps: {},
  version: VERSION,
};

/* ---------------------------- pure helpers ---------------------------- */

export function swapKey(
  programId: string,
  sessionIndex: number,
  exerciseId: string,
): string {
  return `${programId}|${sessionIndex}|${exerciseId}`;
}

/** Validates anything that came out of localStorage. Returns null if unusable. */
export function parsePlanState(raw: unknown): PlanState | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<PlanState>;
  if (candidate.version !== VERSION) return null;
  if (typeof candidate.programId !== "string" || !candidate.programId) return null;
  const swaps: Record<string, string> = {};
  if (candidate.swaps && typeof candidate.swaps === "object") {
    for (const [key, value] of Object.entries(candidate.swaps)) {
      if (typeof value === "string" && value) swaps[key] = value;
    }
  }
  return { programId: candidate.programId, swaps, version: VERSION };
}

export function parsePlanStateJson(raw: string | null): PlanState | null {
  if (!raw) return null;
  try {
    return parsePlanState(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Switching program clears swaps, which are scoped to one program's sessions. */
export function withProgram(state: PlanState, programId: string): PlanState {
  if (state.programId === programId) return state;
  return { ...state, programId, swaps: {} };
}

export function withSwap(
  state: PlanState,
  sessionIndex: number,
  originalId: string,
  replacementId: string,
): PlanState {
  const key = swapKey(state.programId, sessionIndex, originalId);
  if (state.swaps[key] === replacementId) return state;
  return { ...state, swaps: { ...state.swaps, [key]: replacementId } };
}

export function withoutSwap(
  state: PlanState,
  sessionIndex: number,
  originalId: string,
): PlanState {
  const key = swapKey(state.programId, sessionIndex, originalId);
  if (!(key in state.swaps)) return state;
  const swaps = { ...state.swaps };
  delete swaps[key];
  return { ...state, swaps };
}

export function withoutAllSwaps(state: PlanState): PlanState {
  if (Object.keys(state.swaps).length === 0) return state;
  return { ...state, swaps: {} };
}

export interface ResolvedExercise {
  /** The exercise as originally prescribed. */
  originalId: string;
  /** What to actually do — the substitute when one is set. */
  id: string;
  exercise: Exercise;
  sets: number;
  reps: number | null;
  weightKg?: number;
  swapped: boolean;
}

export interface ResolvedSession extends Omit<Session, "exercises"> {
  sessionIndex: number;
  exercises: ResolvedExercise[];
}

/** Applies the user's substitutions to one session of a program. */
export function resolveSession(
  program: Program,
  sessionIndex: number,
  swaps: Record<string, string>,
): ResolvedSession {
  const session = program.sessions[sessionIndex];
  return {
    ...session,
    sessionIndex,
    exercises: session.exercises.map((prescribed: PrescribedExercise) => {
      const swapId =
        swaps[swapKey(program.id, sessionIndex, prescribed.exerciseId)];
      const id = swapId ?? prescribed.exerciseId;
      return {
        originalId: prescribed.exerciseId,
        id,
        exercise: getExercise(id),
        sets: prescribed.sets,
        reps: prescribed.reps,
        weightKg: prescribed.weightKg,
        swapped: id !== prescribed.exerciseId,
      };
    }),
  };
}

export function programFor(state: PlanState): Program {
  return getProgram(state.programId);
}

/* ------------------------------ the store ------------------------------ */

let current: PlanState = DEFAULT_PLAN;
let hydrated = false;
const listeners = new Set<() => void>();

function readStorage(): PlanState | null {
  try {
    if (typeof window === "undefined") return null;
    return parsePlanStateJson(window.localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

function writeStorage(state: PlanState): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable — the plan just won't persist.
  }
}

function hydrate(): void {
  if (hydrated) return;
  hydrated = true;
  current = readStorage() ?? DEFAULT_PLAN;
}

function emit(): void {
  for (const listener of listeners) listener();
}

function commit(next: PlanState): void {
  if (next === current) return;
  current = next;
  writeStorage(next);
  emit();
}

export const trainingPlanStore = {
  subscribe(listener: () => void): () => void {
    hydrate();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Identity-stable snapshot: only replaced when the plan actually changes. */
  getSnapshot(): PlanState {
    hydrate();
    return current;
  },

  getServerSnapshot(): PlanState {
    return DEFAULT_PLAN;
  },

  selectProgram(programId: string): void {
    hydrate();
    commit(withProgram(current, programId));
  },

  swap(sessionIndex: number, originalId: string, replacementId: string): void {
    hydrate();
    commit(withSwap(current, sessionIndex, originalId, replacementId));
  },

  restore(sessionIndex: number, originalId: string): void {
    hydrate();
    commit(withoutSwap(current, sessionIndex, originalId));
  },

  resetSwaps(): void {
    hydrate();
    commit(withoutAllSwaps(current));
  },
};

// Keep a second tab in sync — the plan is shared state, not tab-local.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY) return;
    hydrated = true;
    current = parsePlanStateJson(event.newValue) ?? DEFAULT_PLAN;
    emit();
  });
}
