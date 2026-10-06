import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { identifyPostHog, resetPostHog } from "@/lib/posthog";

/**
 * Keeps PostHog's identity in sync with the Convex auth session so that
 * errors and session replays group per account instead of appearing as
 * anonymous. Renders nothing.
 */
export function PostHogIdentity() {
  const { isLoading, isAuthenticated, user } = useAuth();
  // Tracks the last id we identified so we only call on real changes.
  const lastId = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && user) {
      const id =
        typeof user._id === "string"
          ? user._id
          : (user.email as string | undefined) ?? "authenticated";
      if (lastId.current === id) return;
      lastId.current = id;
      identifyPostHog(id, {
        isAnonymous: Boolean(user.isAnonymous),
        hasEmail: Boolean(user.email),
      });
      return;
    }

    // Signed out: clear so a later sign-in as someone else isn't merged.
    if (lastId.current !== null) {
      lastId.current = null;
      resetPostHog();
    }
  }, [isLoading, isAuthenticated, user]);

  return null;
}
