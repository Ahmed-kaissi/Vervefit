import '@vly-ai/integrations';
import { VerveFitProviders } from "@/components/vervefit/VerveFitProviders";
import { PostHogIdentity } from "@/components/vervefit/PostHogIdentity";
import { GuestMigrator } from "@/components/vervefit/GuestMigrator";
import { AllowGuest } from "@/components/RequireAuth";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, lazy, Suspense, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import { Flame } from "lucide-react";
import { initPostHog } from "@/lib/posthog";
import { registerPwa } from "@/lib/register-pwa";
import { Button } from "@/components/ui/button";
import "./index.css";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Progress = lazy(() => import("./pages/Progress.tsx"));
const Train = lazy(() => import("./pages/Train.tsx"));
const Habits = lazy(() => import("./pages/Habits.tsx"));
const Coach = lazy(() => import("./pages/Coach.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const FeaturesInfo = lazy(() => import("./pages/FeaturesInfo.tsx"));
const HowItWorksInfo = lazy(() => import("./pages/HowItWorksInfo.tsx"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in the browser runtime). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[Preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * The Convex URL is inlined at build time. When it is missing the old code
 * constructed a client with `undefined`, which threw before React mounted and
 * left the user staring at a blank page. Fail loudly and legibly instead.
 */
function resolveConvexUrl(): string | null {
  const raw = import.meta.env.VITE_CONVEX_URL as string | undefined;
  const url = raw?.trim();
  if (!url || url === "undefined" || url === "null") return null;
  // Plain-string RegExp so this file never contains backslash escapes.
  const URL_PATTERN = new RegExp("^https?://.+");
  if (!URL_PATTERN.test(url)) return null;
  return url;
}

const convexUrl = resolveConvexUrl();
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

/** Print-only URL block (no input) — shown once the URL is already set in the
 *  browser's localStorage so the user can copy it back out. */
function UrlSnapshot({ url }: { url: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold">Convex URL set</p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          This build was created with <code>{convexUrl}</code>. The URL is
          stored in your browser's <code>localStorage</code>, not in this
          build, so it will carry to future builds.
        </p>
        <pre className="mt-3 overflow-auto rounded border border-border/60 p-2 text-left text-[10px] leading-4 text-muted-foreground">{url}</pre>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => {
            if (typeof window !== "undefined" && window.prompt) {
              const next = window.prompt("Paste the new Convex URL", url);
              if (next) {
                window.localStorage.setItem("vervefit-convex-url", next);
                window.location.reload();
              }
            }
          }}
        >
          Change URL
        </Button>
      </div>
    </div>
  );
}

/**
 * Reachable phone-first configuration screen. Served at `/` (and at
 * `/convex-url`) whenever `VITE_CONVEX_URL` is not present in the build, so a
 * phone browser that lands on the app is never shown a blank page or a
 * JavaScript stack trace.
 */
function ConvexUrlConfigScreen() {
  const [url, setUrl] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("vervefit-convex-url") || ""
      : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!url.trim()) return;
    // Plain-string RegExp so this file never contains backslash escapes.
    const URL_PATTERN = new RegExp("^https?://.+");
    if (!URL_PATTERN.test(url.trim())) {
      setError("That does not look like an HTTPS URL.");
      return;
    }
    setSaving(true);
    window.localStorage.setItem("vervefit-convex-url", url.trim());
    // The URL is compiled into the browser bundle at build time, so the user
    // must rebuild the container to bake it in. This reload applies it to this
    // tab immediately.
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-md items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-gradient text-primary-foreground">
              <Flame className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-base font-semibold tracking-tight">VerveFit</p>
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Configuration
              </p>
            </div>
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">
            {typeof window !== "undefined" ? window.navigator.userAgent.slice(0, 60) : "mobile"}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          VerveFit needs a Convex backend to save meals, track progress, and run
          the AI coach. Phone browsers land here before any URL is baked in.
        </p>

        <form className="mt-5 space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <label
              htmlFor="convex-url"
              className="block text-sm font-semibold text-foreground"
            >
              Convex deployment URL
            </label>
            <input
              id="convex-url"
              name="convex-url"
              type="url"
              autoComplete="off"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://&lt;your-deployment&gt;.convex.cloud"
              className="block w-full rounded-xl border border-border/70 bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {convexUrl ? (
                <>
                  This build was created with <code>{convexUrl}</code>. Enter a
                  different URL to override it for this tab (it still needs a
                  rebuild before future visitors get it).
                </>
              ) : (
                <>
                  Enter the URL of your Convex deployment. It is saved to this
                  browser and must be rebuilt into the container before it is
                  served to everyone else.
                </>
              )}
            </p>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex gap-3">
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? "Saving…" : "Save Convex URL & rebuild container"}
            </Button>
          </div>
        </form>

        <div className="mt-5 flex flex-col gap-2 text-[11px] leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">Need the URL?</p>
          <p>
            Look for <code>VITE_CONVEX_URL</code> in your <code>.env</code> file
            and in the Convex dashboard, then rebuild with
          </p>
          <p className="overflow-auto rounded border border-border/60 p-2 font-mono text-[10px] text-muted-foreground/80">
            docker build --build-arg VITE_CONVEX_URL=https://&lt;deployment&gt;.convex.cloud .
          </p>
        </div>
      </main>

      <footer className="border-t border-border/40 px-4 py-3 text-[11px] text-muted-foreground">
        You can change the URL any time from this screen.
      </footer>
    </div>
  );
}

/** Shown instead of a blank page when the deployment is misconfigured. */
function MissingConvexUrl() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold">Configuration error</p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          This build is missing <code>VITE_CONVEX_URL</code>, so it cannot reach
          the backend. Rebuild with the deployment URL, for example:
        </p>
        <pre className="mt-3 overflow-auto rounded border border-border/60 p-2 text-left text-[10px] leading-4 text-muted-foreground">
          docker build --build-arg
          VITE_CONVEX_URL=https://&lt;deployment&gt;.convex.cloud .
        </pre>
        <Button variant="outline" className="mt-4" onClick={() => (window.location.href = "/")}>
          Back to configuration
        </Button>
      </div>
    </div>
  );
}

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);
  return null;
}

// Start error tracking before the first render so bootstrap failures are caught.
initPostHog();


function App() {
  if (convex) {
    return (
      <StrictMode>
        <RootErrorBoundary>
          <ToolbarErrorBoundary>
            <VlyToolbar />
          </ToolbarErrorBoundary>
          <ConvexAuthProvider client={convex}>
              <BrowserRouter>
                <RouteSyncer />
                <PostHogIdentity />
                <GuestMigrator />
                <VerveFitProviders>
                  <Suspense fallback={<RouteLoading />}>
                    <Routes>
                      <Route path="/" element={<Landing />} />
                      <Route
                        path="/auth"
                        element={<AuthPage redirectAfterAuth="/dashboard" />}
                      />
                      <Route path="/info/features" element={<FeaturesInfo />} />
                      <Route path="/info/how-it-works" element={<HowItWorksInfo />} />
                      <Route
                        path="/dashboard"
                        element={
                          <AllowGuest>
                            <Dashboard />
                          </AllowGuest>
                        }
                      />
                      <Route
                        path="/progress"
                        element={
                          <AllowGuest>
                            <Progress />
                          </AllowGuest>
                        }
                      />
                      <Route
                        path="/train"
                        element={
                          <AllowGuest>
                            <Train />
                          </AllowGuest>
                        }
                      />
                      <Route
                        path="/habits"
                        element={
                          <AllowGuest>
                            <Habits />
                          </AllowGuest>
                        }
                      />
                      <Route
                        path="/coach"
                        element={
                          <AllowGuest>
                            <Coach />
                          </AllowGuest>
                        }
                      />
                      <Route
                        path="/admin"
                        element={
                          <AllowGuest>
                            <AdminDashboard />
                          </AllowGuest>
                        }
                      />
                    </Routes>
                  </Suspense>
              </VerveFitProviders>
            </BrowserRouter>
          </ConvexAuthProvider>
        </RootErrorBoundary>
      </StrictMode>
    );
  }

  // No Convex URL baked into this build (e.g. a phone browser that landed on
  // https://host/ before the container was rebuilt). Serve the configuration
  // screen — the app can never show a blank page or a stack trace here.
  if (typeof window !== "undefined" && window.localStorage.getItem("vervefit-convex-url")) {
    return <UrlSnapshot url={window.localStorage.getItem("vervefit-convex-url")!} />;
  }

  return <ConvexUrlConfigScreen />;
}

registerPwa();
createRoot(document.getElementById("root")!).render(<App />);
