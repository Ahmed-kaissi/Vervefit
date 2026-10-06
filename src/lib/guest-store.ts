import type { MealEntry, MacroTargets } from "./nutrition";

/** Guest meal data lives in sessionStorage only (cleared when tab closes). */
const KEY = "vervefit-guest-data";
/** Separate flag marking "this visitor chose guest mode". */
const GUEST_FLAG = "vervefit-guest-session";

interface GuestData {
  entries: MealEntry[];
  targets: MacroTargets | null;
  version: 1;
}

const EMPTY: GuestData = { entries: [], targets: null, version: 1 };

function read(): GuestData {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as GuestData;
    if (!parsed || parsed.version !== 1) return EMPTY;
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      targets: parsed.targets ?? null,
      version: 1,
    };
  } catch {
    return EMPTY;
  }
}

function write(data: GuestData) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // sessionStorage full/unavailable — guest data is best-effort
  }
}

// Tiny pub/sub so every hook reading guest data re-renders on change.
const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((fn) => fn());
}

export const guestStore = {
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },

  getEntries(): MealEntry[] {
    return read().entries;
  },
  getEntriesForDate(date: string): MealEntry[] {
    return read().entries.filter((e) => e.date === date);
  },
  addEntry(entry: MealEntry) {
    const data = read();
    data.entries.push(entry);
    write(data);
    notify();
  },
  removeEntry(id: string) {
    const data = read();
    data.entries = data.entries.filter((e) => e.id !== id);
    write(data);
    notify();
  },
  getTargets(): MacroTargets | null {
    return read().targets;
  },
  setTargets(targets: MacroTargets) {
    const data = read();
    data.targets = targets;
    write(data);
    notify();
  },
  /** Mark this browser session as guest mode. */
  markGuestSession() {
    try {
      window.sessionStorage.setItem(GUEST_FLAG, "1");
    } catch {
      // ignore
    }
    notify();
  },
  /** True only if the visitor explicitly chose guest mode this session. */
  isGuestSession(): boolean {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem(GUEST_FLAG) === "1";
    } catch {
      return false;
    }
  },
  /**
   * Non-destructive read for migration.
   *
   * Migration must never clear storage before the cloud write is confirmed,
   * so this is the only way data leaves the guest store. `clearEntries()` is
   * the separate, explicit step that runs after a successful import.
   */
  snapshot(): { entries: MealEntry[]; targets: MacroTargets | null } {
    const data = read();
    return { entries: data.entries, targets: data.targets };
  },
  /**
   * Removes the guest data and the guest flag. Only call after a migration has
   * been confirmed, so a failed import can still be retried.
   */
  clearEntries() {
    try {
      window.sessionStorage.removeItem(KEY);
      window.sessionStorage.removeItem(GUEST_FLAG);
    } catch {
      // ignore
    }
    notify();
  },
};

export function makeLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
