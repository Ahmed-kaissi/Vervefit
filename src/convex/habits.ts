import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** Habits a user has defined, oldest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db
      .query("habits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

/** Habit ticks for a single day, keyed by habitId for cheap lookup. */
export const logsForDay = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db
      .query("habitLogs")
      .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("date", date))
      .collect();
  },
});

/** Every habit tick in a date range, used for streaks and completion rates. */
export const logsInRange = query({
  args: { start: v.string(), end: v.string() },
  handler: async (ctx, { start, end }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const rows = await ctx.db
      .query("habitLogs")
      .withIndex("by_user_day", (q) =>
        q.eq("userId", userId).gte("date", start),
      )
      .collect();
    return rows.filter((row) => row.date <= end);
  },
});

/** Create a habit. Re-adding an existing name revives the archived row. */
export const add = mutation({
  args: { name: v.string(), icon: v.optional(v.string()) },
  handler: async (ctx, { name, icon }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("habits")
      .withIndex("by_user_name", (q) =>
        q.eq("userId", userId).eq("name", name),
      )
      .first();
    if (existing) {
      if (existing.archived) await ctx.db.patch(existing._id, { archived: false });
      return existing._id;
    }
    return await ctx.db.insert("habits", { userId, name, icon });
  },
});

/** Archive a habit and drop its ticks. */
export const remove = mutation({
  args: { habitId: v.id("habits") },
  handler: async (ctx, { habitId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const habit = await ctx.db.get(habitId);
    if (!habit || habit.userId !== userId) throw new Error("Habit not found");

    const logs = await ctx.db
      .query("habitLogs")
      .withIndex("by_user_habit", (q) =>
        q.eq("userId", userId).eq("habitId", habitId),
      )
      .collect();
    for (const log of logs) await ctx.db.delete(log._id);
    await ctx.db.delete(habitId);
    return { ok: true };
  },
});

/** Toggle a habit for a day. Ticking an existing row removes it. */
export const toggle = mutation({
  args: { habitId: v.id("habits"), date: v.string() },
  handler: async (ctx, { habitId, date }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const habit = await ctx.db.get(habitId);
    if (!habit || habit.userId !== userId) throw new Error("Habit not found");

    const forHabit = await ctx.db
      .query("habitLogs")
      .withIndex("by_user_habit", (q) =>
        q.eq("userId", userId).eq("habitId", habitId),
      )
      .collect();
    const existing = forHabit.find((row) => row.date === date);

    if (existing) {
      await ctx.db.delete(existing._id);
      return { done: false };
    }
    await ctx.db.insert("habitLogs", { userId, habitId, date, count: 1 });
    return { done: true };
  },
});
