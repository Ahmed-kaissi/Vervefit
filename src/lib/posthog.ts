import type { PostHog } from "posthog-js";

/**
 * PostHog error tracking + session replay.
 *
 * Reads the project key from `VITE_POSTHOG_KEY`, which you set in the
 * Keys/API keys tab. When the key is absent (local dev, preview without a
 * key) this is a no-op, so the app never crashes on a missing key and no
 * analytics traffic is sent.
 *
 * The SDK is loaded with a dynamic import so its ~300 kB stays out of the
 * initial bundle and never blocks first paint.
 */
const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;

let client: PostHog | null = null;
let pending: Promise<void> | null = null;

/** Idempotent: safe to call on every render. Resolves once loaded. */
export function initPostHog(): Promise<void> {
  if (!KEY) return Promise.resolve();
  if (pending) return pending;

  pending = import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(KEY, {
        api_host: "https://us.i.posthog.com",
        // Never capture passwords, OTPs, or food diary contents.
        autocapture: false,
        capture_pageview: true,
        capture_pageleave: true,
        // Session replay masks every input by default; the email typed into
        // the sign-in form stays redacted.
        session_recording: {
          maskAllInputs: true,
          maskInputOptions: { password: true },
        },
        // Avoid noisy dev-loop noise while still catching real breaks.
        disable_session_recording: import.meta.env.DEV,
        capture_exceptions: true,
        // PostHog's own network/console noise is not interesting here.
        debug: false,
      });
      client = posthog;
    })
    .catch((err) => {
      // Error tracking must never break the app.
      console.warn("[posthog] failed to load:", err);
    });

  return pending;
}

/** Identify the signed-in user so errors group per account. */
export function identifyPostHog(
  userId: string,
  props: Record<string, unknown> = {},
): void {
  client?.identify(userId, props);
}

/** Clear identity on sign-out so events don't leak across accounts. */
export function resetPostHog(): void {
  client?.reset();
}
