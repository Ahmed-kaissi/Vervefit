const KEY = "vervefit-migrate-guest";

export function setGuestMigrationFlag() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    // ignore
  }
}

/**
 * Every "try as guest" CTA must set BOTH flags before navigating:
 * `guestStore.markGuestSession()` or the route guard bounces to /auth, and
 * `setGuestMigrationFlag()` or the visitor's log is dropped on sign-up.
 */

/**
 * Reads the flag without clearing it.
 *
 * The migrator clears it itself (`clearGuestMigrationFlag`) once every import
 * has succeeded, so a failed attempt can be retried on the next load instead
 * of silently losing the guest's log.
 */
export function peekGuestMigrationFlag(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function clearGuestMigrationFlag(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
