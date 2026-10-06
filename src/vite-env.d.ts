/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** PostHog project key. Set this in the Keys/API keys tab. */
  readonly VITE_POSTHOG_KEY?: string;
  /** Convex deployment URL, inlined at build time. The container build fails
   *  loudly if it is missing. */
  readonly VITE_CONVEX_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
