import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DEFAULT_WATER_TARGET_ML = 2000;

/* ------------------------------ water ------------------------------ */

/** Upper bound on the rows one day of water can occupy, so reads stay bounded. */
const WATER_ROWS_PER_DAY = 50;

/** Total water logged (ml) for one day. */
export const waterForDay = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const rows = await ctx.db
      .query("waterLogs")
      .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("date", date))
      .take(WATER_ROWS_PER_DAY);
    return {
      ml: rows.reduce((acc, r) => acc + r.ml, 0),
      targetMl: DEFAULT_WATER_TARGET_ML,
    };
  },
});

/** Add (or subtract, with a negative delta) water for a day. */
export const addWater = mutation({
  args: { date: v.string(), ml: v.number() },
  handler: async (ctx, { date, ml }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    if (!Number.isFinite(ml) || ml === 0) return { ml: 0 };

    const rows = await ctx.db
      .query("waterLogs")
      .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("date", date))
      .take(WATER_ROWS_PER_DAY);

    if (ml < 0) {
      // Subtract from the most recent entries first so the day's total can
      // never drift below zero.
      let remaining = Math.abs(ml);
      const ordered = [...rows].sort((a, b) => b._creationTime - a._creationTime);
      for (const row of ordered) {
        if (remaining <= 0) break;
        const take = Math.min(row.ml, remaining);
        remaining -= take;
        if (row.ml - take <= 0) await ctx.db.delete(row._id);
        else await ctx.db.patch(row._id, { ml: row.ml - take });
      }
    } else {
      const last = rows[rows.length - 1];
      if (last) await ctx.db.patch(last._id, { ml: last.ml + ml });
      else await ctx.db.insert("waterLogs", { userId, date, ml });
    }

    const after = await ctx.db
      .query("waterLogs")
      .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("date", date))
      .take(WATER_ROWS_PER_DAY);
    return { ml: after.reduce((acc, r) => acc + r.ml, 0) };
  },
});

/* ------------------------------ weight ------------------------------ */

/**
 * Weight check-ins in a range, oldest first.
 *
 * The upper bound is part of the index range (`.lte`) instead of an in-memory
 * filter, and the read is capped, so an old account can't stream its whole
 * history for a 30-day chart.
 */
export const weightInRange = query({
  args: { start: v.string(), end: v.string() },
  handler: async (ctx, { start, end }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const [from, to] = start <= end ? [start, end] : [end, start];
    return await ctx.db
      .query("weightLogs")
      .withIndex("by_user_day", (q) =>
        q.eq("userId", userId).gte("date", from).lte("date", to),
      )
      .take(400);
  },
});

/** Record today's weight. One check-in per day — later calls overwrite it. */
export const setWeight = mutation({
  args: { date: v.string(), kg: v.number() },
  handler: async (ctx, { date, kg }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    if (!Number.isFinite(kg) || kg <= 0) throw new Error("Invalid weight");

    const existing = await ctx.db
      .query("weightLogs")
      .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("date", date))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { kg });
      return existing._id;
    }
    return await ctx.db.insert("weightLogs", { userId, date, kg });
  },
});

/* ----------------------------- workouts ----------------------------- */

const exerciseSchema = v.object({
  name: v.string(),
  sets: v.optional(v.number()),
  reps: v.optional(v.number()),
  weightKg: v.optional(v.number()),
});

/** Training sessions in a range, newest first. Bounded and range-indexed. */
export const sessionsInRange = query({
  args: { start: v.string(), end: v.string() },
  handler: async (ctx, { start, end }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const [from, to] = start <= end ? [start, end] : [end, start];
    return await ctx.db
      .query("workoutSessions")
      .withIndex("by_user_day", (q) =>
        q.eq("userId", userId).gte("date", from).lte("date", to),
      )
      .take(200);
  },
});

/** Log a completed training session. */
export const logSession = mutation({
  args: {
    date: v.string(),
    name: v.string(),
    focus: v.optional(v.string()),
    minutes: v.number(),
    calories: v.optional(v.number()),
    exercises: v.optional(v.array(exerciseSchema)),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    if (args.minutes <= 0) throw new Error("Invalid duration");

    return await ctx.db.insert("workoutSessions", { userId, ...args });
  },
});

/** Remove a logged session. */
export const removeSession = mutation({
  args: { sessionId: v.id("workoutSessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const session = await ctx.db.get(sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }
    await ctx.db.delete(sessionId);
    return { ok: true };
  },
});

/* ---------------------------- migration ---------------------------- */

const guestPayload = v.object({
  habits: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      icon: v.optional(v.string()),
    }),
  ),
  habitLogs: v.array(
    v.object({ habitId: v.string(), date: v.string() }),
  ),
  water: v.array(v.object({ date: v.string(), ml: v.number() })),
  weights: v.array(v.object({ date: v.string(), kg: v.number() })),
  sessions: v.array(
    v.object({
      date: v.string(),
      name: v.string(),
      focus: v.optional(v.string()),
      minutes: v.number(),
      calories: v.optional(v.number()),
    }),
  ),
});

/**
 * Import everything a guest logged this session.
 *
 * Guest habit ids are local strings, so they're re-resolved by name against
 * the rows this action creates — a second sign-up in the same browser must
 * merge into the same habit rather than creating a duplicate per import.
 */
/** Per-array cap so a malformed client can't flood the tables in one call. */
const MIGRATION_LIMIT = 500;

export const migrateGuestActivity = mutation({
  args: { data: guestPayload, batchKey: v.optional(v.string()) },
  handler: async (ctx, { data: payload, batchKey }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    // Idempotency: the key is written in the same transaction as the import,
    // so retrying an import whose response was lost inserts nothing new.
    if (batchKey) {
      const done = await ctx.db
        .query("migrations")
        .withIndex("by_user_key", (q) =>
          q.eq("userId", userId).eq("key", batchKey),
        )
        .first();
      if (done) {
        return {
          habits: 0,
          habitLogs: 0,
          water: 0,
          weights: 0,
          sessions: 0,
          skipped: true,
        };
      }
    }

    const data = {
      habits: payload.habits.slice(0, MIGRATION_LIMIT),
      habitLogs: payload.habitLogs.slice(0, MIGRATION_LIMIT),
      water: payload.water.slice(0, MIGRATION_LIMIT),
      weights: payload.weights.slice(0, MIGRATION_LIMIT),
      sessions: payload.sessions.slice(0, MIGRATION_LIMIT),
    };

    // Map each incoming guest habit name -> the cloud habit id, and each
    // guest habit id -> its cloud id so ticks can be re-pointed.
    const byName = new Map<string, string>();
    const idMap = new Map<string, string>();
    const existing = await ctx.db
      .query("habits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(100);
    for (const habit of existing) byName.set(habit.name, habit._id);

    for (const habit of data.habits) {
      if (byName.has(habit.name)) {
        idMap.set(habit.id, byName.get(habit.name)!);
        continue;
      }
      const id = await ctx.db.insert("habits", {
        userId,
        name: habit.name,
        icon: habit.icon,
      });
      byName.set(habit.name, id);
      idMap.set(habit.id, id);
    }

    // Skip ticks that already exist so re-running the import is safe.
    const existingLogs = await ctx.db
      .query("habitLogs")
      .withIndex("by_user_habit", (q) => q.eq("userId", userId))
      .take(2000);
    const seen = new Set(existingLogs.map((l) => `${l.habitId}|${l.date}`));

    let habitCount = 0;
    for (const log of data.habitLogs) {
      const habitId = idMap.get(log.habitId);
      if (!habitId) continue;
      const key = `${habitId}|${log.date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      await ctx.db.insert("habitLogs", {
        userId,
        habitId: habitId as never,
        date: log.date,
        count: 1,
      });
      habitCount += 1;
    }

    for (const entry of data.water) {
      if (entry.ml <= 0) continue;
      await ctx.db.insert("waterLogs", { userId, date: entry.date, ml: entry.ml });
    }
    for (const entry of data.weights) {
      await ctx.db.insert("weightLogs", { userId, date: entry.date, kg: entry.kg });
    }
    for (const session of data.sessions) {
      await ctx.db.insert("workoutSessions", { userId, ...session });
    }

    if (batchKey) {
      await ctx.db.insert("migrations", { userId, key: batchKey, at: Date.now() });
    }

    return {
      habits: data.habits.length,
      habitLogs: habitCount,
      water: data.water.length,
      weights: data.weights.length,
      sessions: data.sessions.length,
      skipped: false,
    };
  },
});
