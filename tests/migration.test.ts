import { describe, expect, test } from "bun:test";
import {
  clearBatchKey,
  countActivityPayload,
  getOrCreateBatchKey,
  migrateGuestActivityData,
  migrateGuestMeals,
  toActivityPayload,
  toBulkMealEntries,
  type GuestActivityData,
} from "../src/lib/migration";
import type { MealEntry } from "../src/lib/nutrition";

function meal(overrides: Partial<MealEntry> = {}): MealEntry {
  return {
    id: "local-1",
    date: "2026-01-05",
    mealType: "lunch",
    quantity: 1,
    loggedAt: 1,
    name: "Chicken Breast, Grilled",
    category: "Protein",
    servingSize: 100,
    servingUnit: "g",
    calories: 165,
    proteinG: 31,
    carbsG: 0,
    fatG: 3.6,
    ...overrides,
  };
}

function activity(): GuestActivityData {
  return {
    habits: [{ id: "gh-1", name: "Walk 8,000 steps", icon: "🚶" }],
    habitLogs: [{ habitId: "gh-1", date: "2026-01-05" }],
    water: { "2026-01-05": 1500 },
    weights: [{ date: "2026-01-05", kg: 72.4 }],
    sessions: [
      {
        id: "gs-1",
        date: "2026-01-05",
        name: "Upper A",
        focus: "Strength",
        minutes: 45,
        calories: 216,
      },
    ],
  };
}

class FakeStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

describe("meal payload mapping", () => {
  test("maps local entries onto the cloud shape", () => {
    const [entry] = toBulkMealEntries([meal()]);
    expect(entry.foodName).toBe("Chicken Breast, Grilled");
    expect(entry.mealType).toBe("lunch");
    expect(entry.calories).toBe(165);
    // The local-only fields must not leak into the mutation payload.
    expect("id" in entry).toBe(false);
    expect("name" in entry).toBe(false);
    expect("loggedAt" in entry).toBe(false);
  });

  test("drops malformed rows instead of sending them", () => {
    const bad = [
      { ...meal(), date: undefined as unknown as string },
      { ...meal(), name: "" },
    ];
    expect(toBulkMealEntries(bad)).toHaveLength(0);
  });
});

describe("activity payload mapping", () => {
  test("flattens water into a payload list and drops empty days", () => {
    const payload = toActivityPayload({
      ...activity(),
      water: { "2026-01-05": 1500, "2026-01-04": 0 },
    });
    expect(payload.water).toEqual([{ date: "2026-01-05", ml: 1500 }]);
  });

  test("handles a missing store", () => {
    const payload = toActivityPayload(null);
    expect(countActivityPayload(payload)).toBe(0);
  });

  test("counts everything a guest accumulated", () => {
    expect(countActivityPayload(toActivityPayload(activity()))).toBe(5);
  });
});

describe("meal migration", () => {
  test("clears local data only after the upload resolves", async () => {
    const order: string[] = [];
    const result = await migrateGuestMeals({
      readMeals: () => ({ entries: [meal()], targets: null }),
      migrateMeals: async () => {
        order.push("upload");
      },
      clearMeals: () => {
        order.push("clear");
      },
      batchKey: "meals-test-1",
    });
    expect(order).toEqual(["upload", "clear"]);
    expect(result).toEqual({ attempted: 1, cleared: true });
  });

  test("a failed upload preserves the local data", async () => {
    let cleared = false;
    await expect(
      migrateGuestMeals({
        readMeals: () => ({ entries: [meal()], targets: null }),
        migrateMeals: async () => {
          throw new Error("network down");
        },
        clearMeals: () => {
          cleared = true;
        },
        batchKey: "meals-test-2",
      }),
    ).rejects.toThrow("network down");
    expect(cleared).toBe(false);
  });

  test("nothing to migrate means no upload at all", async () => {
    let uploaded = false;
    const result = await migrateGuestMeals({
      readMeals: () => ({ entries: [], targets: null }),
      migrateMeals: async () => {
        uploaded = true;
      },
      clearMeals: () => {},
      batchKey: "meals-test-3",
    });
    expect(uploaded).toBe(false);
    expect(result.attempted).toBe(0);
  });

  test("a retry reuses the same batch key, so the server can dedupe it", () => {
    const storage = new FakeStorage();
    const first = getOrCreateBatchKey("meals", storage as unknown as Storage);
    const retry = getOrCreateBatchKey("meals", storage as unknown as Storage);
    expect(retry).toBe(first);

    clearBatchKey("meals", storage as unknown as Storage);
    const next = getOrCreateBatchKey("meals", storage as unknown as Storage);
    expect(next).not.toBe(first);
  });

  test("the meals and activity keys are independent", () => {
    const storage = new FakeStorage();
    const meals = getOrCreateBatchKey("meals", storage as unknown as Storage);
    const act = getOrCreateBatchKey("activity", storage as unknown as Storage);
    expect(meals).not.toBe(act);
  });
});

describe("activity migration", () => {
  test("clears only after a confirmed write", async () => {
    const order: string[] = [];
    const result = await migrateGuestActivityData({
      readActivity: () => activity(),
      migrateActivity: async (payload) => {
        order.push(`upload:${countActivityPayload(payload)}`);
      },
      clearActivity: () => {
        order.push("clear");
      },
      batchKey: "activity-test-1",
    });
    expect(order).toEqual(["upload:5", "clear"]);
    expect(result.cleared).toBe(true);
  });

  test("failure keeps the guest's habits, water and training", async () => {
    let cleared = false;
    await expect(
      migrateGuestActivityData({
        readActivity: () => activity(),
        migrateActivity: async () => {
          throw new Error("server error");
        },
        clearActivity: () => {
          cleared = true;
        },
        batchKey: "activity-test-2",
      }),
    ).rejects.toThrow("server error");
    expect(cleared).toBe(false);
  });

  test("an empty store is a no-op rather than a pointless write", async () => {
    let uploaded = false;
    const result = await migrateGuestActivityData({
      readActivity: () => null,
      migrateActivity: async () => {
        uploaded = true;
      },
      clearActivity: () => {},
      batchKey: "activity-test-3",
    });
    expect(uploaded).toBe(false);
    expect(result.attempted).toBe(0);
  });
});
