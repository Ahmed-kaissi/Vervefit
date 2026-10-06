/**
 * Form demos for the Train tab.
 *
 * `free-exercise-db` (public domain) ships two photos per exercise — the start
 * and end position of the movement — served straight off jsDelivr. Playing them
 * as a cross-fade is what makes the mini window in the session view read as a
 * loop of the exercise rather than a still.
 *
 * Only the slug map lives in the bundle. The step-by-step instructions and
 * muscle lists come from the dataset's 1 MB index, fetched once per session the
 * first time someone opens a demo and then cached — so the demo itself renders
 * instantly from the photos, and the text fills in behind it.
 */

import { EXERCISES } from "@/lib/training-plans";

const CDN = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main";
const INDEX_URL = `${CDN}/dist/exercises.json`;

/**
 * Our exercise id -> free-exercise-db slug. Chosen by hand because the closest
 * name is not always the closest movement: our "Back Squat" wants the plain
 * `Barbell_Squat`, not `Hack_Squat`, and our "Push-Up" wants `Pushups`, not
 * `Plyo_Push-up`.
 *
 * `foam-roll` is intentionally absent — the dataset has no foam rolling, so it
 * falls back to the cue-only panel.
 */
const DEMO_SLUGS: Record<string, string> = {
  bench: "Barbell_Bench_Press_-_Medium_Grip",
  "incline-db": "Incline_Dumbbell_Press",
  "flat-db": "Dumbbell_Bench_Press",
  "cable-fly": "Flat_Bench_Cable_Flyes",
  pushup: "Pushups",
  dip: "Dips_-_Chest_Version",
  "pec-deck": "Butterfly",
  "landmine-press": "Standing_Palm-In_One-Arm_Dumbbell_Press",
  deadlift: "Barbell_Deadlift",
  "barbell-row": "Bent_Over_Barbell_Row",
  "db-row": "One-Arm_Dumbbell_Row",
  "lat-pulldown": "Wide-Grip_Lat_Pulldown",
  "seated-row": "Seated_Cable_Rows",
  pullup: "Pullups",
  chinup: "Chin-Up",
  "face-pull": "Face_Pull",
  "renegade-row": "Alternating_Renegade_Row",
  shrug: "Barbell_Shrug",
  ohp: "Standing_Military_Press",
  "db-shoulder-press": "Dumbbell_Shoulder_Press",
  "lateral-raise": "Side_Lateral_Raise",
  "rear-delt-fly": "Cable_Rear_Delt_Fly",
  "arnold-press": "Arnold_Dumbbell_Press",
  "upright-row": "Upright_Barbell_Row",
  "pike-pushup": "Handstand_Push-Ups",
  "barbell-curl": "Barbell_Curl",
  "db-curl": "Dumbbell_Bicep_Curl",
  "hammer-curl": "Hammer_Curls",
  "preacher-curl": "Preacher_Curl",
  "cable-curl": "Standing_Biceps_Cable_Curl",
  "zottman-curl": "Zottman_Curl",
  pushdown: "Triceps_Pushdown_-_Rope_Attachment",
  "db-kickback": "Tricep_Dumbbell_Kickback",
  skullcrusher: "Lying_Triceps_Press",
  "overhead-ext": "Standing_Dumbbell_Triceps_Extension",
  "bench-dip": "Bench_Dips",
  "triceps-dip": "Dips_-_Triceps_Version",
  squat: "Barbell_Squat",
  "front-squat": "Front_Barbell_Squat",
  "leg-press": "Leg_Press",
  "leg-extension": "Leg_Extensions",
  "bulgarian-split-squat": "Split_Squat_with_Dumbbells",
  lunge: "Barbell_Walking_Lunge",
  "step-up": "Step-up_with_Knee_Raise",
  "hack-squat": "Hack_Squat",
  rdl: "Romanian_Deadlift",
  "leg-curl": "Lying_Leg_Curls",
  "hip-thrust": "Barbell_Hip_Thrust",
  "glute-bridge": "Butt_Lift_Bridge",
  "nordic-curl": "Natural_Glute_Ham_Raise",
  "kb-swing": "One-Arm_Kettlebell_Swings",
  "good-morning": "Good_Morning",
  "calf-raise": "Standing_Calf_Raises",
  "seated-calf": "Seated_Calf_Raise",
  "donkey-raise": "Donkey_Calf_Raises",
  plank: "Plank",
  "hanging-leg-raise": "Hanging_Leg_Raise",
  "cable-crunch": "Cable_Crunch",
  "russian-twist": "Russian_Twist",
  "dead-bug": "Dead_Bug",
  "ab-wheel": "Barbell_Ab_Rollout",
  "side-plank": "Side_Bridge",
  "pallof-press": "Pallof_Press",
  run: "Running_Treadmill",
  row: "Rowing_Stationary",
  bike: "Bicycling_Stationary",
  "stair-climber": "Stairmaster",
  "jump-rope": "Rope_Jumping",
  elliptical: "Elliptical_Trainer",
  "brisk-walk": "Walking_Treadmill",
  "hip-mobility": "Standing_Hip_Circles",
  "thoracic-rotation": "Torso_Rotation",
  "deep-squat-hold": "Bodyweight_Squat",
  "cat-cow": "Cat_Stretch",
  "band-pull-apart": "Band_Pull_Apart",
  "worlds-greatest": "Worlds_Greatest_Stretch",
};

const EXERCISE_ID_BY_NAME = new Map(EXERCISES.map((e) => [e.name, e.id]));

export interface DemoFrames {
  /** Starting position. */
  start: string;
  /** End position — the two frames cross-fade to show the movement. */
  end: string;
}

/** Photo pair for an exercise id, or null when the dataset has no demo. */
export function demoFrames(exerciseId: string): DemoFrames | null {
  const slug = DEMO_SLUGS[exerciseId];
  if (!slug) return null;
  return {
    start: `${CDN}/exercises/${slug}/0.jpg`,
    end: `${CDN}/exercises/${slug}/1.jpg`,
  };
}

/** Same, for the places that only carry the logged exercise name. */
export function demoFramesByName(exerciseName: string): DemoFrames | null {
  const id = EXERCISE_ID_BY_NAME.get(exerciseName);
  return id ? demoFrames(id) : null;
}

/** Our library id for a name, for logged sessions that only store the name. */
export function exerciseIdByName(exerciseName: string): string | undefined {
  return EXERCISE_ID_BY_NAME.get(exerciseName);
}

export interface ExerciseDetail {
  instructions: string[];
  level: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
}

const MUSCLE_LABELS: Record<string, string> = {
  abdominals: "Abs",
  abductors: "Abductors",
  adductors: "Adductors",
  biceps: "Biceps",
  calves: "Calves",
  chest: "Chest",
  forearms: "Forearms",
  glutes: "Glutes",
  hamstrings: "Hamstrings",
  lats: "Lats",
  "lower back": "Lower back",
  "middle back": "Mid back",
  neck: "Neck",
  quadriceps: "Quads",
  shoulders: "Shoulders",
  traps: "Traps",
  triceps: "Triceps",
};

export function muscleLabel(muscle: string): string {
  return MUSCLE_LABELS[muscle] ?? muscle;
}

export function levelLabel(level: string): string {
  if (level === "beginner") return "Beginner";
  if (level === "intermediate") return "Intermediate";
  if (level === "expert") return "Advanced";
  return level;
}

interface RawExercise {
  id: string;
  name: string;
  level: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

let indexPromise: Promise<Map<string, RawExercise> | null> | null = null;

/**
 * Fetch the dataset once, trimmed to the exercises we actually reference, and
 * keep it for the session. Resolves to null on any failure so the caller can
 * fall back to the written cue instead of breaking the demo.
 */
function loadIndex(): Promise<Map<string, RawExercise> | null> {
  if (!indexPromise) {
    const wanted = new Set(Object.values(DEMO_SLUGS));
    indexPromise = fetch(INDEX_URL)
      .then((res) => (res.ok ? (res.json() as Promise<RawExercise[]>) : null))
      .then((rows) => {
        if (!Array.isArray(rows)) return null;
        const map = new Map<string, RawExercise>();
        for (const row of rows) {
          if (wanted.has(row.id)) map.set(row.id, row);
        }
        return map;
      })
      .catch(() => null);
  }
  return indexPromise;
}

/** Step-by-step form notes and target muscles for an exercise. */
export async function loadExerciseDetail(
  exerciseId: string,
): Promise<ExerciseDetail | null> {
  const slug = DEMO_SLUGS[exerciseId];
  if (!slug) return null;
  const map = await loadIndex();
  const raw = map?.get(slug);
  if (!raw) return null;
  return {
    instructions: (raw.instructions ?? []).filter(Boolean).slice(0, 5),
    level: raw.level,
    primaryMuscles: (raw.primaryMuscles ?? []).slice(0, 3),
    secondaryMuscles: (raw.secondaryMuscles ?? []).slice(0, 3),
  };
}
