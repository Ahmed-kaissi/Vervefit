import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove

      // VerveFit profile fields
      fitnessLevel: v.optional(v.string()),
      mainGoal: v.optional(v.string()),
      dailyCalorieTarget: v.optional(v.number()),
      proteinTargetG: v.optional(v.number()),
      carbsTargetG: v.optional(v.number()),
      fatTargetG: v.optional(v.number()),
      theme: v.optional(v.string()),
      waterTargetMl: v.optional(v.number()),
      weightKg: v.optional(v.number()),
      heightCm: v.optional(v.number()),
      age: v.optional(v.number()),
      sex: v.optional(v.string()),
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // Daily habit definitions (one row per habit, per user)
    habits: defineTable({
      userId: v.id("users"),
      name: v.string(),
      icon: v.optional(v.string()),
      targetPerDay: v.optional(v.number()),
      archived: v.optional(v.boolean()),
    })
      .index("by_user", ["userId"])
      .index("by_user_name", ["userId", "name"]),

    // A habit being ticked off on a given day
    habitLogs: defineTable({
      userId: v.id("users"),
      habitId: v.id("habits"),
      date: v.string(),
      count: v.optional(v.number()),
    })
      .index("by_user_day", ["userId", "date"])
      .index("by_user_habit", ["userId", "habitId"]),

    // Water intake for a given day
    waterLogs: defineTable({
      userId: v.id("users"),
      date: v.string(),
      ml: v.number(),
    }).index("by_user_day", ["userId", "date"]),

    // Body weight check-ins
    weightLogs: defineTable({
      userId: v.id("users"),
      date: v.string(),
      kg: v.number(),
    })
      .index("by_user_day", ["userId", "date"])
      .index("by_user", ["userId"]),

    // Completed training sessions
    workoutSessions: defineTable({
      userId: v.id("users"),
      date: v.string(),
      name: v.string(),
      focus: v.optional(v.string()),
      minutes: v.number(),
      calories: v.optional(v.number()),
      exercises: v.optional(
        v.array(
          v.object({
            name: v.string(),
            sets: v.optional(v.number()),
            reps: v.optional(v.number()),
            weightKg: v.optional(v.number()),
          }),
        ),
      ),
    })
      .index("by_user_day", ["userId", "date"])
      .index("by_user", ["userId"]),

    // AI coach conversation transcript (one row per turn)
    coachMessages: defineTable({
      userId: v.id("users"),
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      // Timestamp the turn was recorded at; indexed so reads are ordered and
      // bounded instead of collecting the whole transcript.
      at: v.number(),
      // Which layer answered: "deterministic", "lightweight" or "reasoning".
      route: v.optional(v.string()),
      // Which provider served it: "deterministic", "free" or "deepseek".
      provider: v.optional(v.string()),
      // The exact model id that produced this answer ("rules" for layer 1).
      model: v.optional(v.string()),
    })
      .index("by_user", ["userId"])
      .index("by_user_at", ["userId", "at"]),

    // Coach request ledger: powers per-user rate limiting and observability.
    // Never stores prompts, answers or credentials.
    coachUsage: defineTable({
      userId: v.id("users"),
      at: v.number(),
      route: v.string(),
      provider: v.optional(v.string()),
      model: v.optional(v.string()),
      ok: v.boolean(),
      latencyMs: v.optional(v.number()),
      fallbackReason: v.optional(v.string()),
      promptTokens: v.optional(v.number()),
      completionTokens: v.optional(v.number()),
    })
      .index("by_user", ["userId"])
      .index("by_user_at", ["userId", "at"]),

    // Shared food database (seeded once, searchable by all users)
    foods: defineTable({
      name: v.string(),
      brand: v.optional(v.string()),
      category: v.string(),
      servingSize: v.number(),
      servingUnit: v.string(),
      servingLabel: v.optional(v.string()),
      calories: v.number(),
      proteinG: v.number(),
      carbsG: v.number(),
      fatG: v.number(),
    }).index("by_name", ["name"]),

    // A single logged meal: one food item, one serving.
    mealEntries: defineTable({
      userId: v.id("users"),
      date: v.string(), // "YYYY-MM-DD" in the user's local timezone
      mealType: v.union(
        v.literal("breakfast"),
        v.literal("lunch"),
        v.literal("dinner"),
        v.literal("snack"),
      ),
      foodName: v.string(),
      brand: v.optional(v.string()),
      servingLabel: v.optional(v.string()),
      servingSize: v.number(),
      servingUnit: v.string(),
      quantity: v.number(),
      calories: v.number(),
      proteinG: v.number(),
      carbsG: v.number(),
      fatG: v.number(),
    })
      .index("by_user_day", ["userId", "date"])
      .index("by_user", ["userId"]),

    // Idempotency ledger for background imports (guest activity, meal bulk-add).
    // One row per userId+key; the key is recorded in the same transaction that
    // guards the rows it imports, so a lost-response retry is a no-op.
    migrations: defineTable({
      userId: v.id("users"),
      key: v.string(),
      at: v.number(),
    })
      .index("by_user_key", ["userId", "key"]),

    // Daily streak snapshots computed by the midnight cron.
    // One row per user per day; the latest row per user is the current streak.
    streakSnapshots: defineTable({
      userId: v.id("users"),
      date: v.string(),
      streakDays: v.number(),
      // The date of the last logged day in the streak (YYYY-MM-DD).
      lastLoggedDate: v.string(),
      // Whether the streak is still active (true) or broken (false).
      active: v.boolean(),
    })
      .index("by_user", ["userId"])
      .index("by_user_date", ["userId", "date"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
