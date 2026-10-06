import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Local "YYYY-MM-DD" string. Must match the format used to store
 * `mealEntries.date`, otherwise string range comparisons silently drop the
 * boundary day.
 */
export function toIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse "YYYY-MM-DD" into a local-midnight Date. */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}


/** All meal entries for the signed-in user on a given local date. */
export const getDay = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db
      .query("mealEntries")
      .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("date", date))
      .collect();
  },
});

/** All meal entries in a date window ([start, end] inclusive). */
export const getRange = query({
  args: { start: v.string(), end: v.string() },
  handler: async (ctx, { start, end }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    // Guard against a reversed window, which would return nothing.
    const from = start <= end ? start : end;
    const to = start <= end ? end : start;
    return await ctx.db
      .query("mealEntries")
      .withIndex("by_user_day", (q) =>
        q.eq("userId", userId).gte("date", from).lte("date", to),
      )
      .collect();
  },
});

/** All entries for the `days` days ending at (and including) endDate. */
export const getWeek = query({
  args: { endDate: v.string(), days: v.number() },
  handler: async (ctx, { endDate, days }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const span = Math.max(1, Math.floor(days));
    const cursor = parseLocalDate(endDate);
    cursor.setDate(cursor.getDate() - (span - 1));
    const start = toIsoLocal(cursor);
    return await ctx.db
      .query("mealEntries")
      .withIndex("by_user_day", (q) =>
        q.eq("userId", userId).gte("date", start).lte("date", endDate),
      )
      .collect();
  },
});

/**
 * Upper bound on how much of the shared food table a single search will read.
 * The table is global and read-heavy, so an unbounded `.collect()` here was a
 * full-table scan on every keystroke for every user.
 */
const FOOD_SCAN_LIMIT = 2000;

/** Search the shared cloud food database by name. Bounded. */
export const searchFoods = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, { searchTerm }) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term || term.length < 2) return [];
    const foods = await ctx.db.query("foods").withIndex("by_name").take(FOOD_SCAN_LIMIT);
    const scored = foods
      .filter((f) => f.name.toLowerCase().includes(term))
      .sort((a, b) => {
        const ai = a.name.toLowerCase().indexOf(term);
        const bi = b.name.toLowerCase().indexOf(term);
        if (ai !== bi) return ai - bi;
        return a.name.length - b.name.length;
      })
      .slice(0, 20);
    return scored;
  },
});

/** Popular foods (used for the empty-search quick-add grid). Bounded. */
export const popularFoods = query({
  args: {},
  handler: async (ctx) => {
    const foods = await ctx.db.query("foods").withIndex("by_name").take(FOOD_SCAN_LIMIT);
    const preferred = [
      "Chicken Breast, Grilled",
      "Banana",
      "Large Egg",
      "White Rice, Cooked",
      "Greek Yogurt, Plain",
      "Rolled Oats, Dry",
      "Avocado",
      "Whole Wheat Bread",
      "Almonds",
      "Salmon Fillet",
      "Cottage Cheese, Low-Fat",
      "Peanut Butter",
      "Broccoli, Steamed",
      "Sweet Potato, Baked",
      "Beef, Lean Ground 90/10",
      "Olive Oil",
      "Whole Milk",
      "Apple",
      "Pasta, Cooked",
      "Cheddar Cheese",
    ];
    return preferred
      .map((name) => foods.find((f) => f.name === name))
      .filter((f): f is NonNullable<typeof f> => Boolean(f))
      .slice(0, 12);
  },
});

/** Insert a meal entry for the signed-in user. */
export const add = mutation({
  args: {
    date: v.string(),
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
  },
  handler: async (ctx, entry) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    if (!entry.foodName.trim()) throw new Error("Food name is required");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
      throw new Error("date must be YYYY-MM-DD");
    }
    const id = await ctx.db.insert("mealEntries", {
      ...entry,
      foodName: entry.foodName.trim().slice(0, 200),
      quantity: Math.max(0, entry.quantity),
      calories: Math.max(0, entry.calories),
      proteinG: Math.max(0, entry.proteinG),
      carbsG: Math.max(0, entry.carbsG),
      fatG: Math.max(0, entry.fatG),
      userId,
    });
    return id;
  },
});

/** Remove one meal entry (must belong to the caller). */
export const remove = mutation({
  args: { id: v.id("mealEntries") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const entry = await ctx.db.get(id);
    if (!entry) return { ok: true };
    if (entry.userId !== userId) throw new Error("Not authorized");
    await ctx.db.delete(id);
    return { ok: true };
  },
});

/**
 * One-time migration: move guest (sessionStorage) entries into the cloud log.
 *
 * `batchKey` makes the call idempotent. The key is recorded in the same
 * transaction as the rows it guards, so a client that retries after a lost
 * response gets a no-op instead of a duplicated log.
 */
export const bulkAdd = mutation({
  args: {
    batchKey: v.optional(v.string()),
    entries: v.array(
      v.object({
        date: v.string(),
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
      }),
    ),
  },
  handler: async (ctx, { entries, batchKey }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    if (batchKey) {
      const done = await ctx.db
        .query("migrations")
        .withIndex("by_user_key", (q) =>
          q.eq("userId", userId).eq("key", batchKey),
        )
        .first();
      if (done) return { ok: true, count: 0, skipped: true };
    }

    // Bounded so a malformed client can't flood the table in one call.
    const batch = entries.slice(0, 500);
    let inserted = 0;
    for (const entry of batch) {
      const name = entry.foodName.trim();
      if (!name) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) continue;
      await ctx.db.insert("mealEntries", {
        ...entry,
        foodName: name.slice(0, 200),
        quantity: Math.max(0, entry.quantity),
        calories: Math.max(0, entry.calories),
        proteinG: Math.max(0, entry.proteinG),
        carbsG: Math.max(0, entry.carbsG),
        fatG: Math.max(0, entry.fatG),
        userId,
      });
      inserted += 1;
    }
    if (batchKey) {
      await ctx.db.insert("migrations", { userId, key: batchKey, at: Date.now() });
    }
    return { ok: true, count: inserted, skipped: false };
  },
});

/**
 * Seed the shared food database from a curated open dataset. Idempotent:
 * skips foods whose names already exist.
 */
export const seedFoods = action({
  args: {},
  handler: async (ctx) => {
    const res = await fetch(
      "https://raw.githubusercontent.com/hnrathod/food-database/master/foods.json",
    );
    if (!res.ok) {
      throw new Error(`Failed to fetch food database (HTTP ${res.status})`);
    }
    type RemoteFood = {
      name?: string;
      brand?: string;
      category?: string;
      serving?: { size?: number; unit?: string; label?: string };
      nutrition?: {
        calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
      };
    };
    const remote = (await res.json()) as RemoteFood[];

    const existing = (await ctx.runQuery(internal.meals.listAllFoods, {})) as Array<{
      name: string;
    }>;
    const existingNames = new Set(existing.map((f) => f.name));
    // The seed dataset is a few thousand rows; cap the remote loop so a
    // runaway response can never turn into an unbounded write burst.
    const remoteRows = remote.slice(0, 5000);

    let inserted = 0;
    for (const f of remoteRows) {
      const name = f?.name ? String(f.name).trim() : "";
      if (!name || existingNames.has(name)) continue;
      await ctx.runMutation(internal.meals.insertFood, {
        name,
        brand: f.brand ? String(f.brand) : undefined,
        category: f.category ? String(f.category) : "Other",
        servingSize: Number.isFinite(Number(f.serving?.size))
          ? Number(f.serving?.size)
          : 100,
        servingUnit: f.serving?.unit ? String(f.serving.unit) : "g",
        servingLabel: f.serving?.label ? String(f.serving.label) : undefined,
        calories: Math.round(Number(f.nutrition?.calories ?? 0)) || 0,
        proteinG: Number(f.nutrition?.protein ?? 0) || 0,
        carbsG: Number(f.nutrition?.carbs ?? 0) || 0,
        fatG: Number(f.nutrition?.fat ?? 0) || 0,
      });
      existingNames.add(name);
      inserted += 1;
    }
    return { ok: true, inserted };
  },
});

export const listAllFoods = internalQuery({
  args: {},
  handler: async (ctx) =>
    await ctx.db.query("foods").withIndex("by_name").take(FOOD_SCAN_LIMIT),
});

export const insertFood = internalMutation({
  args: {
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
  },
  handler: async (ctx, food) => {
    await ctx.db.insert("foods", food);
  },
});
