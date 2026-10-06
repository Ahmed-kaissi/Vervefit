import { describe, expect, test } from "bun:test";
import { PROGRAMS, alternativesFor, getExercise, getProgram } from "../src/lib/training-plans";
import {
  DEFAULT_PLAN,
  parsePlanState,
  parsePlanStateJson,
  resolveSession,
  swapKey,
  withProgram,
  withSwap,
  withoutAllSwaps,
  withoutSwap,
} from "../src/lib/training-plan-store";

describe("programs", () => {
  test("the default program exists and has a full week", () => {
    const program = getProgram(DEFAULT_PLAN.programId);
    expect(program.id).toBe(DEFAULT_PLAN.programId);
    expect(program.week).toHaveLength(7);
  });

  test("an unknown program id falls back to the default instead of crashing", () => {
    expect(getProgram("nope").id).toBe(getProgram(DEFAULT_PLAN.programId).id);
  });

  test("every scheduled session index resolves to a real session", () => {
    for (const program of PROGRAMS) {
      for (const idx of program.week) {
        if (idx === null) continue;
        expect(program.sessions[idx]).toBeDefined();
      }
    }
  });

  test("every prescribed exercise exists in the library", () => {
    for (const program of PROGRAMS) {
      for (const session of program.sessions) {
        for (const prescribed of session.exercises) {
          expect(getExercise(prescribed.exerciseId).id).toBe(prescribed.exerciseId);
        }
      }
    }
  });

  test("alternatives never include the exercise itself and target the same group first", () => {
    const list = alternativesFor("bench");
    expect(list.length).toBeGreaterThan(0);
    expect(list.some((e) => e.id === "bench")).toBe(false);
    expect(list[0].group).toBe(getExercise("bench").group);
    expect(list[0].id).not.toBe("bench");
  });

  test("an unknown exercise id still yields usable alternatives", () => {
    const list = alternativesFor("not-a-real-exercise");
    expect(list.length).toBeGreaterThan(0);
    expect(list.some((e) => e.id === "not-a-real-exercise")).toBe(false);
  });
});

describe("plan state", () => {
  test("switching program clears swaps, which are program-scoped", () => {
    const swapped = withSwap(DEFAULT_PLAN, 0, "bench-press", "incline-dumbbell-press");
    expect(Object.keys(swapped.swaps)).toHaveLength(1);
    const other = withProgram(swapped, "fullbody");
    expect(other.programId).toBe("fullbody");
    expect(Object.keys(other.swaps)).toHaveLength(0);
  });

  test("selecting the same program is a no-op", () => {
    expect(withProgram(DEFAULT_PLAN, DEFAULT_PLAN.programId)).toBe(DEFAULT_PLAN);
  });

  test("swaps are keyed by program, session and exercise", () => {
    expect(swapKey("upperlower", 2, "bench-press")).toBe(
      "upperlower|2|bench-press",
    );
    const a = withSwap(DEFAULT_PLAN, 0, "bench-press", "push-up");
    const b = withSwap(DEFAULT_PLAN, 1, "bench-press", "push-up");
    expect(Object.keys(a.swaps)).not.toEqual(Object.keys(b.swaps));
  });

  test("a swap is reversible", () => {
    const swapped = withSwap(DEFAULT_PLAN, 0, "bench-press", "push-up");
    const restored = withoutSwap(swapped, 0, "bench-press");
    expect(Object.keys(restored.swaps)).toHaveLength(0);
  });

  test("restoring an exercise that was never swapped is a no-op", () => {
    expect(withoutSwap(DEFAULT_PLAN, 0, "bench-press")).toBe(DEFAULT_PLAN);
  });

  test("re-applying the same swap keeps the same object identity", () => {
    const once = withSwap(DEFAULT_PLAN, 0, "bench-press", "push-up");
    expect(withSwap(once, 0, "bench-press", "push-up")).toBe(once);
  });

  test("reset clears every swap", () => {
    let state = withSwap(DEFAULT_PLAN, 0, "bench-press", "push-up");
    state = withSwap(state, 1, "squat", "goblet-squat");
    expect(Object.keys(state.swaps)).toHaveLength(2);
    expect(Object.keys(withoutAllSwaps(state).swaps)).toHaveLength(0);
  });
});

describe("persistence parsing", () => {
  test("round-trips a valid plan", () => {
    expect(parsePlanState({ programId: "ppl", swaps: { a: "b" }, version: 1 })).toEqual({
      programId: "ppl",
      swaps: { a: "b" },
      version: 1,
    });
  });

  test("rejects a wrong version, a missing id and junk", () => {
    expect(parsePlanState({ programId: "ppl", version: 2 })).toBeNull();
    expect(parsePlanState({ version: 1 })).toBeNull();
    expect(parsePlanState(null)).toBeNull();
    expect(parsePlanState("nope")).toBeNull();
  });

  test("drops invalid swap values instead of trusting storage", () => {
    expect(
      parsePlanState({ programId: "ppl", version: 1, swaps: { a: 5, b: "ok" } }),
    ).toEqual({ programId: "ppl", swaps: { b: "ok" }, version: 1 });
  });

  test("survives corrupt JSON", () => {
    expect(parsePlanStateJson("{not json")).toBeNull();
  });
});

describe("session resolution", () => {
  test("applies the user's swap and marks it", () => {
    const program = getProgram("upperlower");
    const sessionIndex = program.week.find((idx) => idx !== null)!;
    const session = program.sessions[sessionIndex];
    const target = session.exercises[0].exerciseId;
    const replacement = alternativesFor(target)[0];
    expect(replacement.id).not.toBe(target);

    const resolved = resolveSession(program, sessionIndex, {
      [swapKey(program.id, sessionIndex, target)]: replacement.id,
    });
    const exercise = resolved.exercises[0];
    expect(exercise.originalId).toBe(target);
    expect(exercise.id).toBe(replacement.id);
    expect(exercise.swapped).toBe(true);
  });

  test("without a swap the prescription is unchanged", () => {
    const program = getProgram("upperlower");
    const sessionIndex = program.week.find((idx) => idx !== null)!;
    const resolved = resolveSession(program, sessionIndex, {});
    expect(resolved.exercises.every((e) => !e.swapped)).toBe(true);
    expect(resolved.sessionIndex).toBe(sessionIndex);
  });

  test("set and rep prescriptions survive a swap", () => {
    const program = getProgram("upperlower");
    const sessionIndex = program.week.find((idx) => idx !== null)!;
    const prescribed = program.sessions[sessionIndex].exercises[0];
    const resolved = resolveSession(program, sessionIndex, {});
    expect(resolved.exercises[0].sets).toBe(prescribed.sets);
    expect(resolved.exercises[0].reps).toBe(prescribed.reps);
  });
});
