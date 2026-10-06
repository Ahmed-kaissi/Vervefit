import { useSyncExternalStore } from "react";
import { guestStore } from "@/lib/guest-store";

/**
 * Reactive guest-mode flag.
 *
 * True only when the visitor explicitly chose "Continue as guest" in this
 * browser session. Reading it through the guest store's subscribe means the
 * UI updates the moment they log something or sign in, without a reload.
 */
export function useIsGuest(): boolean {
  return useSyncExternalStore(
    guestStore.subscribe,
    guestStore.isGuestSession,
    // Server/SSR snapshot: never a guest until the client says so.
    () => false,
  );
}
