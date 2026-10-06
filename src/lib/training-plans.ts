/**
 * Exercise library + program definitions for the Train tab.
 *
 * Everything is data, not components: a program is a list of sessions, a
 * session is a list of exercise ids, and the same exercise can appear in
 * several programs. That last point is what makes swapping work — an exercise
 * carries its own muscle group, so a replacement is just "another exercise
 * from the same group".
 */

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core"
  | "cardio"
  | "fullBody";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "cardio";

export interface Exercise {
  id: string;
  name: string;
  group: MuscleGroup;
  equipment: Equipment;
  /** One-line form cue shown in the session list. */
  cue: string;
}

export interface PrescribedExercise {
  exerciseId: string;
  sets: number;
  /** `null` means timed, not counted — used for cardio and mobility holds. */
  reps: number | null;
  weightKg?: number;
}

export interface Session {
  name: string;
  focus: "Strength" | "Cardio" | "Mobility";
  icon: string;
  minutes: number;
  exercises: PrescribedExercise[];
}

export interface Program {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  /** `null` in a day means rest. Monday is index 0. */
  week: (number | null)[];
  sessions: Session[];
}

export const GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  core: "Core",
  cardio: "Cardio",
  fullBody: "Full body",
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  machine: "Machine",
  cable: "Cable",
  bodyweight: "Bodyweight",
  cardio: "Cardio",
};

export const EXERCISES: Exercise[] = [
  // chest
  { id: "bench", name: "Barbell Bench Press", group: "chest", equipment: "barbell", cue: "Shoulder blades pinned, bar to mid-chest" },
  { id: "incline-db", name: "Incline Dumbbell Press", group: "chest", equipment: "dumbbell", cue: "30° bench, drive up and slightly in" },
  { id: "flat-db", name: "Dumbbell Bench Press", group: "chest", equipment: "dumbbell", cue: "Elbows ~45° in, touch mid-chest" },
  { id: "cable-fly", name: "Cable Fly", group: "chest", equipment: "cable", cue: "Soft elbows, hug across the chest" },
  { id: "pushup", name: "Push-Up", group: "chest", equipment: "bodyweight", cue: "Rigid line from heels to head" },
  { id: "dip", name: "Dip", group: "chest", equipment: "bodyweight", cue: "Stay upright to keep the chest working" },
  { id: "pec-deck", name: "Chest Press Machine", group: "chest", equipment: "machine", cue: "Full lockout, slow on the way back" },
  { id: "landmine-press", name: "Landmine Press", group: "chest", equipment: "barbell", cue: "Angled bar, press up and forward" },

  // back
  { id: "deadlift", name: "Conventional Deadlift", group: "back", equipment: "barbell", cue: "Bar against the shins, push the floor away" },
  { id: "barbell-row", name: "Barbell Row", group: "back", equipment: "barbell", cue: "Hinge to 45°, pull to the lower ribs" },
  { id: "db-row", name: "Single-Arm Dumbbell Row", group: "back", equipment: "dumbbell", cue: "Brace, pull elbow to the hip" },
  { id: "lat-pulldown", name: "Lat Pulldown", group: "back", equipment: "cable", cue: "Chest up, elbows to the back pockets" },
  { id: "seated-row", name: "Seated Cable Row", group: "back", equipment: "cable", cue: "No torso swing, pause at the chest" },
  { id: "pullup", name: "Pull-Up", group: "back", equipment: "bodyweight", cue: "Start from a dead hang, chest to the bar" },
  { id: "chinup", name: "Chin-Up", group: "back", equipment: "bodyweight", cue: "Supinated grip, pull to the chin" },
  { id: "face-pull", name: "Face Pull", group: "back", equipment: "cable", cue: "Rope to the forehead, rotate thumbs back" },
  { id: "renegade-row", name: "Renegade Row", group: "back", equipment: "dumbbell", cue: "Wide feet, no hip rotation" },
  { id: "shrug", name: "Barbell Shrug", group: "back", equipment: "barbell", cue: "Straight up and down, don't roll" },

  // shoulders
  { id: "ohp", name: "Overhead Press", group: "shoulders", equipment: "barbell", cue: "Squeeze glutes, stack wrist over elbow" },
  { id: "db-shoulder-press", name: "Dumbbell Shoulder Press", group: "shoulders", equipment: "dumbbell", cue: "Forearms vertical at the top" },
  { id: "lateral-raise", name: "Lateral Raise", group: "shoulders", equipment: "dumbbell", cue: "Lead with the elbows, stop at shoulder height" },
  { id: "rear-delt-fly", name: "Rear Delt Fly", group: "shoulders", equipment: "cable", cue: "Bend the elbows, spread wide" },
  { id: "arnold-press", name: "Arnold Press", group: "shoulders", equipment: "dumbbell", cue: "Rotate palms as you press up" },
  { id: "upright-row", name: "Upright Row", group: "shoulders", equipment: "cable", cue: "Elbows lead, stop at the chest" },
  { id: "pike-pushup", name: "Pike Push-Up", group: "shoulders", equipment: "bodyweight", cue: "Hips high, head to the floor" },

  // biceps
  { id: "barbell-curl", name: "Barbell Curl", group: "biceps", equipment: "barbell", cue: "Elbows pinned, no swinging" },
  { id: "db-curl", name: "Dumbbell Curl", group: "biceps", equipment: "dumbbell", cue: "Supinate hard at the top" },
  { id: "hammer-curl", name: "Hammer Curl", group: "biceps", equipment: "dumbbell", cue: "Neutral grip, target the brachialis" },
  { id: "preacher-curl", name: "Preacher Curl", group: "biceps", equipment: "machine", cue: "Elbows on the pad, full squeeze" },
  { id: "cable-curl", name: "Cable Curl", group: "biceps", equipment: "cable", cue: "Constant tension, no wrist break" },
  { id: "zottman-curl", name: "Zottman Curl", group: "biceps", equipment: "dumbbell", cue: "Supinate up, pronate down" },

  // triceps
  { id: "pushdown", name: "Triceps Pushdown", group: "triceps", equipment: "cable", cue: "Elbows locked to the ribs" },
  { id: "db-kickback", name: "Dumbbell Kickback", group: "triceps", equipment: "dumbbell", cue: "Hinge, extend without moving the upper arm" },
  { id: "skullcrusher", name: "Skull Crusher", group: "triceps", equipment: "barbell", cue: "Upper arms angled back, elbows bend only" },
  { id: "overhead-ext", name: "Overhead Triceps Extension", group: "triceps", equipment: "dumbbell", cue: "Keep the elbows pointing forward" },
  { id: "bench-dip", name: "Bench Dip", group: "triceps", equipment: "bodyweight", cue: "Close to the bench, heels on the floor" },
  { id: "triceps-dip", name: "Triceps Dip", group: "triceps", equipment: "bodyweight", cue: "Stay upright, shoulders below elbows" },

  // quads
  { id: "squat", name: "Back Squat", group: "quads", equipment: "barbell", cue: "Knees track the toes, brace hard" },
  { id: "front-squat", name: "Front Squat", group: "quads", equipment: "barbell", cue: "Elbows high, upright chest" },
  { id: "leg-press", name: "Leg Press", group: "quads", equipment: "machine", cue: "Feet mid-platform, don't lock the knees" },
  { id: "leg-extension", name: "Leg Extension", group: "quads", equipment: "machine", cue: "Squeeze the quads at the top" },
  { id: "bulgarian-split-squat", name: "Bulgarian Split Squat", group: "quads", equipment: "dumbbell", cue: "Drop the back knee straight down" },
  { id: "lunge", name: "Walking Lunge", group: "quads", equipment: "dumbbell", cue: "Long stride, quiet landing" },
  { id: "step-up", name: "Box Step-Up", group: "quads", equipment: "bodyweight", cue: "Drive through the whole foot" },
  { id: "hack-squat", name: "Hack Squat", group: "quads", equipment: "machine", cue: "Low back flat against the pad" },

  // hamstrings + glutes
  { id: "rdl", name: "Romanian Deadlift", group: "hamstrings", equipment: "barbell", cue: "Hinge, bar stays close to the legs" },
  { id: "leg-curl", name: "Leg Curl", group: "hamstrings", equipment: "machine", cue: "Curl the heels to the glutes" },
  { id: "hip-thrust", name: "Barbell Hip Thrust", group: "glutes", equipment: "barbell", cue: "Chin tucked, finish with a glute squeeze" },
  { id: "glute-bridge", name: "Glute Bridge", group: "glutes", equipment: "bodyweight", cue: "Squeeze hard at lockout" },
  { id: "nordic-curl", name: "Nordic Curl", group: "hamstrings", equipment: "bodyweight", cue: "Fight the fall, slow eccentric" },
  { id: "kb-swing", name: "Kettlebell Swing", group: "glutes", equipment: "dumbbell", cue: "Hinge and snap, the hips do the work" },
  { id: "good-morning", name: "Good Morning", group: "hamstrings", equipment: "barbell", cue: "Soft knees, flat back, feel the stretch" },

  // calves
  { id: "calf-raise", name: "Standing Calf Raise", group: "calves", equipment: "machine", cue: "Full stretch down, pause at the top" },
  { id: "seated-calf", name: "Seated Calf Raise", group: "calves", equipment: "machine", cue: "Targets the soleus, go slow" },
  { id: "donkey-raise", name: "Donkey Calf Raise", group: "calves", equipment: "bodyweight", cue: "Big stretch, explode up" },

  // core
  { id: "plank", name: "Plank", group: "core", equipment: "bodyweight", cue: "Squeeze glutes, ribs down" },
  { id: "hanging-leg-raise", name: "Hanging Leg Raise", group: "core", equipment: "bodyweight", cue: "Curl the pelvis up, don't swing" },
  { id: "cable-crunch", name: "Cable Crunch", group: "core", equipment: "cable", cue: "Bring the ribs to the pelvis" },
  { id: "russian-twist", name: "Russian Twist", group: "core", equipment: "dumbbell", cue: "Rotate from the ribcage, not the arm" },
  { id: "dead-bug", name: "Dead Bug", group: "core", equipment: "bodyweight", cue: "Lower back stays glued down" },
  { id: "ab-wheel", name: "Ab Wheel Rollout", group: "core", equipment: "bodyweight", cue: "Only go as far as you can keep the hips tucked" },
  { id: "side-plank", name: "Side Plank", group: "core", equipment: "bodyweight", cue: "Stack the shoulders, lift the hips" },
  { id: "pallof-press", name: "Pallof Press", group: "core", equipment: "cable", cue: "Resist rotation, slow return" },

  // cardio
  { id: "run", name: "Treadmill Run", group: "cardio", equipment: "cardio", cue: "Cadence over speed, relaxed shoulders" },
  { id: "row", name: "Rowing Machine", group: "cardio", equipment: "cardio", cue: "Legs, then back, then arms" },
  { id: "bike", name: "Stationary Bike", group: "cardio", equipment: "cardio", cue: "Steady resistance you could hold an hour" },
  { id: "stair-climber", name: "Stair Climber", group: "cardio", equipment: "cardio", cue: "Full foot on each step" },
  { id: "jump-rope", name: "Jump Rope", group: "cardio", equipment: "cardio", cue: "Small hops, wrists do the work" },
  { id: "elliptical", name: "Elliptical", group: "cardio", equipment: "cardio", cue: "Low impact, great for recovery days" },
  { id: "brisk-walk", name: "Brisk Walk", group: "cardio", equipment: "bodyweight", cue: "Arms swinging, pace you could chat at" },

  // mobility / warm-up
  { id: "hip-mobility", name: "Hip Mobility Flow", group: "fullBody", equipment: "bodyweight", cue: "Move slowly through the whole range" },
  { id: "thoracic-rotation", name: "Thoracic Rotation", group: "fullBody", equipment: "bodyweight", cue: "Rotate the upper back, keep hips square" },
  { id: "deep-squat-hold", name: "Deep Squat Hold", group: "fullBody", equipment: "bodyweight", cue: "Elbows press the knees out" },
  { id: "cat-cow", name: "Cat-Cow", group: "fullBody", equipment: "bodyweight", cue: "Move one vertebra at a time" },
  { id: "foam-roll", name: "Foam Roll", group: "fullBody", equipment: "bodyweight", cue: "Slow passes over tight spots" },
  { id: "band-pull-apart", name: "Band Pull-Apart", group: "back", equipment: "bodyweight", cue: "Straight arms, squeeze the shoulder blades" },
  { id: "worlds-greatest", name: "World's Greatest Stretch", group: "fullBody", equipment: "bodyweight", cue: "Breathe out as you sink" },
];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise {
  return (
    BY_ID.get(id) ?? {
      id,
      name: id,
      group: "fullBody",
      equipment: "bodyweight",
      cue: "",
    }
  );
}

/** Shorthand so programs read as a workout, not as data entry. */
function ex(
  exerciseId: string,
  sets: number,
  reps: number | null,
  weightKg?: number,
): PrescribedExercise {
  return weightKg === undefined
    ? { exerciseId, sets, reps }
    : { exerciseId, sets, reps, weightKg };
}

/* ------------------------------ programs ------------------------------ */

export const PROGRAMS: Program[] = [
  {
    id: "bro",
    name: "Bro Split",
    tagline: "One body part a day — chest, back, legs, shoulders, arms.",
    icon: "🗓️",
    week: [0, 1, 2, 3, 4, null, null],
    sessions: [
      {
        name: "Chest",
        focus: "Strength",
        icon: "💪",
        minutes: 55,
        exercises: [
          ex("incline-db", 4, 10, 24),
          ex("bench", 4, 8, 60),
          ex("cable-fly", 3, 15, 15),
          ex("pushup", 3, 20),
          ex("dip", 3, 10),
        ],
      },
      {
        name: "Back",
        focus: "Strength",
        icon: "🔙",
        minutes: 55,
        exercises: [
          ex("deadlift", 4, 5, 90),
          ex("barbell-row", 4, 10, 50),
          ex("lat-pulldown", 3, 12, 45),
          ex("seated-row", 3, 12, 40),
          ex("face-pull", 3, 15, 12),
        ],
      },
      {
        name: "Legs",
        focus: "Strength",
        icon: "🦵",
        minutes: 60,
        exercises: [
          ex("squat", 5, 5, 80),
          ex("rdl", 3, 10, 60),
          ex("leg-press", 3, 12, 120),
          ex("leg-curl", 3, 12, 40),
          ex("calf-raise", 4, 15, 40),
        ],
      },
      {
        name: "Shoulders",
        focus: "Strength",
        icon: "🔺",
        minutes: 50,
        exercises: [
          ex("ohp", 4, 6, 35),
          ex("db-shoulder-press", 3, 10, 14),
          ex("lateral-raise", 4, 15, 8),
          ex("rear-delt-fly", 3, 15, 10),
          ex("shrug", 3, 12, 50),
        ],
      },
      {
        name: "Arms",
        focus: "Strength",
        icon: "💪",
        minutes: 45,
        exercises: [
          ex("barbell-curl", 4, 10, 25),
          ex("hammer-curl", 3, 12, 12),
          ex("skullcrusher", 3, 10, 25),
          ex("pushdown", 3, 15, 20),
          ex("overhead-ext", 3, 12, 12),
        ],
      },
    ],
  },
  {
    id: "ppl",
    name: "Push / Pull / Legs",
    tagline: "Six days a week — each muscle hit twice, every muscle at least once.",
    icon: "🔥",
    week: [0, 1, 2, null, 3, 4, 5],
    sessions: [
      {
        name: "Push A",
        focus: "Strength",
        icon: "🫸",
        minutes: 60,
        exercises: [
          ex("bench", 4, 6, 60),
          ex("ohp", 4, 8, 35),
          ex("incline-db", 3, 10, 24),
          ex("lateral-raise", 4, 15, 8),
          ex("pushdown", 3, 12, 20),
        ],
      },
      {
        name: "Pull A",
        focus: "Strength",
        icon: "🫷",
        minutes: 60,
        exercises: [
          ex("deadlift", 3, 5, 90),
          ex("barbell-row", 4, 8, 50),
          ex("lat-pulldown", 3, 10, 45),
          ex("face-pull", 3, 15, 12),
          ex("barbell-curl", 3, 10, 25),
        ],
      },
      {
        name: "Legs A",
        focus: "Strength",
        icon: "🦵",
        minutes: 60,
        exercises: [
          ex("squat", 5, 5, 80),
          ex("rdl", 3, 10, 60),
          ex("leg-press", 3, 12, 120),
          ex("calf-raise", 4, 15, 40),
        ],
      },
      {
        name: "Push B",
        focus: "Strength",
        icon: "🫸",
        minutes: 55,
        exercises: [
          ex("ohp", 4, 6, 35),
          ex("incline-db", 4, 10, 24),
          ex("db-shoulder-press", 3, 12, 14),
          ex("rear-delt-fly", 4, 15, 10),
          ex("overhead-ext", 3, 12, 12),
        ],
      },
      {
        name: "Pull B",
        focus: "Strength",
        icon: "🫷",
        minutes: 55,
        exercises: [
          ex("pullup", 4, 8),
          ex("db-row", 4, 10, 22),
          ex("seated-row", 3, 12, 40),
          ex("shrug", 3, 12, 50),
          ex("hammer-curl", 3, 12, 12),
        ],
      },
      {
        name: "Legs B",
        focus: "Strength",
        icon: "🦵",
        minutes: 55,
        exercises: [
          ex("front-squat", 4, 6, 60),
          ex("bulgarian-split-squat", 3, 10, 12),
          ex("leg-curl", 4, 12, 40),
          ex("hip-thrust", 3, 12, 60),
          ex("leg-extension", 3, 15, 30),
        ],
      },
    ],
  },
  {
    id: "upperlower",
    name: "Upper / Lower",
    tagline: "Four days a week, the most popular split. Great if life is busy.",
    icon: "⚖️",
    week: [0, 1, null, 2, 3, null, null],
    sessions: [
      {
        name: "Upper A",
        focus: "Strength",
        icon: "🔝",
        minutes: 50,
        exercises: [
          ex("bench", 4, 8, 60),
          ex("barbell-row", 4, 10, 50),
          ex("ohp", 3, 10, 35),
          ex("lat-pulldown", 3, 12, 45),
          ex("db-curl", 3, 12, 12),
          ex("pushdown", 3, 12, 20),
        ],
      },
      {
        name: "Lower A",
        focus: "Strength",
        icon: "🔽",
        minutes: 55,
        exercises: [
          ex("squat", 5, 5, 80),
          ex("rdl", 3, 10, 60),
          ex("bulgarian-split-squat", 3, 10, 12),
          ex("leg-curl", 3, 12, 40),
          ex("calf-raise", 4, 15, 40),
        ],
      },
      {
        name: "Upper B",
        focus: "Strength",
        icon: "🔝",
        minutes: 50,
        exercises: [
          ex("incline-db", 4, 10, 24),
          ex("pullup", 4, 8),
          ex("db-shoulder-press", 3, 12, 14),
          ex("seated-row", 3, 12, 40),
          ex("lateral-raise", 4, 15, 8),
          ex("hammer-curl", 3, 12, 12),
        ],
      },
      {
        name: "Lower B",
        focus: "Strength",
        icon: "🔽",
        minutes: 55,
        exercises: [
          ex("deadlift", 3, 5, 90),
          ex("front-squat", 4, 8, 60),
          ex("leg-press", 3, 12, 120),
          ex("hip-thrust", 3, 12, 60),
          ex("seated-calf", 4, 15, 40),
        ],
      },
    ],
  },
  {
    id: "fullbody",
    name: "Full Body ×3",
    tagline: "Three sessions a week that touch everything. Best for beginners.",
    icon: "🌱",
    week: [0, null, 1, null, 2, null, null],
    sessions: [
      {
        name: "Full Body A",
        focus: "Strength",
        icon: "🅰️",
        minutes: 45,
        exercises: [
          ex("squat", 3, 8, 50),
          ex("bench", 3, 8, 40),
          ex("barbell-row", 3, 10, 35),
          ex("ohp", 3, 10, 25),
          ex("plank", 3, null),
        ],
      },
      {
        name: "Full Body B",
        focus: "Strength",
        icon: "🅱️",
        minutes: 45,
        exercises: [
          ex("deadlift", 3, 5, 70),
          ex("incline-db", 3, 10, 16),
          ex("lat-pulldown", 3, 12, 35),
          ex("db-shoulder-press", 3, 10, 10),
          ex("dead-bug", 3, null),
        ],
      },
      {
        name: "Full Body C",
        focus: "Strength",
        icon: "🅲",
        minutes: 45,
        exercises: [
          ex("front-squat", 3, 8, 40),
          ex("dip", 3, 10),
          ex("db-row", 3, 10, 18),
          ex("lateral-raise", 3, 15, 6),
          ex("hanging-leg-raise", 3, null),
        ],
      },
    ],
  },
  {
    id: "dumbbell",
    name: "Dumbbell Only",
    tagline: "No barbell, no machines. Everything you need is a pair of dumbbells.",
    icon: "🏠",
    week: [0, 1, null, 2, null, 3, null],
    sessions: [
      {
        name: "Upper",
        focus: "Strength",
        icon: "🔝",
        minutes: 45,
        exercises: [
          ex("flat-db", 4, 10, 24),
          ex("db-row", 4, 10, 22),
          ex("db-shoulder-press", 3, 12, 14),
          ex("lateral-raise", 3, 15, 8),
          ex("db-curl", 3, 12, 12),
          ex("overhead-ext", 3, 12, 12),
        ],
      },
      {
        name: "Lower",
        focus: "Strength",
        icon: "🔽",
        minutes: 45,
        exercises: [
          ex("bulgarian-split-squat", 4, 10, 14),
          ex("rdl", 4, 10, 24),
          ex("lunge", 3, 12, 12),
          ex("hip-thrust", 4, 12, 30),
          ex("donkey-raise", 3, 15),
        ],
      },
      {
        name: "Full Body",
        focus: "Strength",
        icon: "🔄",
        minutes: 45,
        exercises: [
          ex("step-up", 3, 10, 12),
          ex("renegade-row", 3, 10, 16),
          ex("db-shoulder-press", 3, 12, 12),
          ex("plank", 3, null),
        ],
      },
      {
        name: "Conditioning",
        focus: "Cardio",
        icon: "🏃",
        minutes: 35,
        exercises: [
          ex("brisk-walk", 1, null),
          ex("kb-swing", 4, 15, 16),
          ex("jump-rope", 4, 2),
          ex("row", 1, null),
        ],
      },
    ],
  },
  {
    id: "mobility",
    name: "Mobility + Core",
    tagline: "Recovery work for rest days. Twenty minutes, no sweat required.",
    icon: "🧘",
    week: [0, null, 1, null, 2, null, 3],
    sessions: [
      {
        name: "Hips & Hamstrings",
        focus: "Mobility",
        icon: "🦴",
        minutes: 20,
        exercises: [
          ex("hip-mobility", 2, null),
          ex("deep-squat-hold", 3, null),
          ex("cat-cow", 2, 10),
          ex("foam-roll", 1, null),
        ],
      },
      {
        name: "Shoulders & Posture",
        focus: "Mobility",
        icon: "🔄",
        minutes: 20,
        exercises: [
          ex("band-pull-apart", 3, 15),
          ex("thoracic-rotation", 3, 10),
          ex("worlds-greatest", 2, 8),
          ex("pike-pushup", 2, 10),
        ],
      },
      {
        name: "Core",
        focus: "Strength",
        icon: "🎯",
        minutes: 20,
        exercises: [
          ex("plank", 3, null),
          ex("hanging-leg-raise", 3, 12),
          ex("cable-crunch", 3, 15, 20),
          ex("side-plank", 3, null),
          ex("ab-wheel", 3, 10),
        ],
      },
      {
        name: "Easy Cardio",
        focus: "Cardio",
        icon: "🌊",
        minutes: 30,
        exercises: [
          ex("brisk-walk", 1, null),
          ex("bike", 1, null),
        ],
      },
    ],
  },
];

export const PROGRAM_BY_ID = new Map(PROGRAMS.map((p) => [p.id, p]));

export function getProgram(id: string): Program {
  return PROGRAM_BY_ID.get(id) ?? PROGRAMS[2]; // Upper / Lower as the default
}

/** Session scheduled for a Monday-0 index, or null on a rest day. */
export function sessionForDay(program: Program, mondayIndex: number): Session | null {
  const idx = program.week[mondayIndex] ?? null;
  if (idx === null) return null;
  return program.sessions[idx] ?? null;
}

/** Index of a session inside the program, used to key per-session swaps. */
export function sessionIndexForDay(
  program: Program,
  mondayIndex: number,
): number | null {
  return program.week[mondayIndex] ?? null;
}

/**
 * Alternatives for one exercise: same muscle group first, then anything the
 * user could plausibly substitute. Never returns the exercise itself.
 */
export function alternativesFor(
  exerciseId: string,
  limit = 12,
): Exercise[] {
  const current = getExercise(exerciseId);
  const sameGroup = EXERCISES.filter(
    (e) => e.id !== current.id && e.group === current.group,
  );
  const adjacent = EXERCISES.filter(
    (e) =>
      e.id !== current.id &&
      e.group !== current.group &&
      ADJACENT[current.group].includes(e.group),
  );
  return [...sameGroup, ...adjacent].slice(0, limit);
}

const ADJACENT: Record<MuscleGroup, MuscleGroup[]> = {
  chest: ["shoulders", "triceps", "fullBody"],
  back: ["biceps", "shoulders", "core", "fullBody"],
  shoulders: ["chest", "triceps", "fullBody"],
  biceps: ["back", "fullBody"],
  triceps: ["chest", "shoulders", "fullBody"],
  quads: ["hamstrings", "glutes", "calves"],
  hamstrings: ["glutes", "quads", "calves"],
  glutes: ["hamstrings", "quads"],
  calves: ["quads", "hamstrings"],
  core: ["fullBody", "back"],
  cardio: ["fullBody"],
  fullBody: ["core", "back", "shoulders"],
};
