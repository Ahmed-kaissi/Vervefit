import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get the current signed in user. Returns null if the user is not signed in.
 * Usage: const signedInUser = await ctx.runQuery(api.authHelpers.currentUser);
 * THIS FUNCTION IS READ-ONLY. DO NOT MODIFY.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db.get(userId);
  },
});

/** Update the signed-in user's VerveFit goals (daily calorie + macro targets). */
export const updateGoals = mutation({
  args: {
    dailyCalorieTarget: v.number(),
    proteinTargetG: v.number(),
    carbsTargetG: v.number(),
    fatTargetG: v.number(),
    mainGoal: v.string(),
    fitnessLevel: v.string(),
  },
  handler: async (
    ctx,
    { dailyCalorieTarget, proteinTargetG, carbsTargetG, fatTargetG, mainGoal, fitnessLevel },
  ) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    await ctx.db.patch(userId, {
      dailyCalorieTarget,
      proteinTargetG,
      carbsTargetG,
      fatTargetG,
      mainGoal,
      fitnessLevel,
    });
    return { ok: true };
  },
});
