import { describe, expect, test } from "bun:test";
import {
  computeStreak,
  isIsoDate,
  lastNDates,
  mondayIndexOf,
  shiftDateStr,
  startOfWeek,
  toDateStr,
} from "../src/convex/lib/dates";

describe("date arithmetic", () => {
  test("toDateStr uses local components, not UTC", () => {
    // 00:30 local on the 1st must stay the 1st even where UTC is still the
    // previous day.
    expect(toDateStr(new Date(2026, 0, 1, 0, 30))).toBe("2026-01-01");
    expect(toDateStr(new Date(2026, 11, 31, 23, 30))).toBe("2026-12-31");
  });

  test("shiftDateStr crosses a month boundary", () => {
    expect(shiftDateStr("2026-01-31", 1)).toBe("2026-02-01");
    expect(shiftDateStr("2026-03-01", -1)).toBe("2026-02-28");
  });

  test("shiftDateStr crosses a year boundary", () => {
    expect(shiftDateStr("2025-12-31", 1)).toBe("2026-01-01");
    expect(shiftDateStr("2026-01-01", -1)).toBe("2025-12-31");
  });

  test("shiftDateStr handles a leap day", () => {
    expect(shiftDateStr("2024-02-28", 1)).toBe("2024-02-29");
    expect(shiftDateStr("2024-02-29", 1)).toBe("2024-03-01");
    expect(shiftDateStr("2025-02-28", 1)).toBe("2025-03-01");
  });

  test("lastNDates returns the window oldest first, inclusive of the end", () => {
    const days = lastNDates(7, "2026-01-05");
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2025-12-30");
    expect(days[6]).toBe("2026-01-05");
  });

  test("ISO dates sort chronologically as strings across a year boundary", () => {
    const days = ["2025-12-30", "2026-01-02", "2025-12-31"];
    expect([...days].sort()).toEqual(["2025-12-30", "2025-12-31", "2026-01-02"]);
  });

  test("mondayIndexOf puts Monday at 0 and Sunday at 6", () => {
    expect(mondayIndexOf(new Date(2026, 0, 5))).toBe(0); // Monday
    expect(mondayIndexOf(new Date(2026, 0, 11))).toBe(6); // Sunday
  });

  test("startOfWeek returns the Monday of that week", () => {
    expect(startOfWeek("2026-01-11")).toBe("2026-01-05"); // Sunday -> Monday
    expect(startOfWeek("2026-01-05")).toBe("2026-01-05");
    expect(startOfWeek("2026-01-01")).toBe("2025-12-29"); // across the year
  });

  test("isIsoDate rejects anything that is not a padded ISO date", () => {
    expect(isIsoDate("2026-01-05")).toBe(true);
    expect(isIsoDate("2026-1-5")).toBe(false);
    expect(isIsoDate("today")).toBe(false);
    expect(isIsoDate(null)).toBe(false);
  });
});

describe("computeStreak", () => {
  test("counts consecutive days ending today", () => {
    expect(
      computeStreak(["2026-01-05", "2026-01-04", "2026-01-03"], "2026-01-05"),
    ).toBe(3);
  });

  test("survives an unticked today so it does not reset each morning", () => {
    expect(computeStreak(["2026-01-04", "2026-01-03"], "2026-01-05")).toBe(2);
  });

  test("is zero when yesterday and today are both empty", () => {
    expect(computeStreak(["2026-01-01"], "2026-01-05")).toBe(0);
  });

  test("stops at the first gap", () => {
    expect(
      computeStreak(["2026-01-05", "2026-01-04", "2026-01-02"], "2026-01-05"),
    ).toBe(2);
  });

  test("spans a month boundary", () => {
    expect(
      computeStreak(["2026-03-01", "2026-02-28", "2026-02-27"], "2026-03-01"),
    ).toBe(3);
  });

  test("spans a year boundary", () => {
    expect(
      computeStreak(["2026-01-01", "2025-12-31", "2025-12-30"], "2026-01-01"),
    ).toBe(3);
  });

  test("ignores duplicates", () => {
    expect(
      computeStreak(["2026-01-05", "2026-01-05", "2026-01-04"], "2026-01-05"),
    ).toBe(2);
  });

  test("accepts any iterable", () => {
    const set = new Set(["2026-01-05", "2026-01-04"]);
    expect(computeStreak(set, "2026-01-05")).toBe(2);
  });
});
