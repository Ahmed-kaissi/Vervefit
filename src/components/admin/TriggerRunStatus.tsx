import { useCallback, useMemo, useState } from "react";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { useRun } from "@trigger.dev/react-hooks";
import { healthCheckTask } from "@/trigger/example";

type RunStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "success"; output: Record<string, unknown>; finishedAt: Date }
  | { state: "error"; error: string; finishedAt: Date };

function statusLabel(state: RunStatus["state"]) {
  switch (state) {
    case "idle":
      return "Not yet run";
    case "loading":
      return "Running…";
    case "success":
      return "Completed";
    case "error":
      return "Failed";
  }
}

function StatusIcon({ state }: { state: RunStatus["state"] }) {
  switch (state) {
    case "idle":
      return <Clock className="size-4 text-muted-foreground" aria-hidden="true" />;
    case "loading":
      return <Loader2 className="size-4 animate-spin text-[#CEFF00]" aria-hidden="true" />;
    case "success":
      return <CheckCircle className="size-4 text-emerald-400" aria-hidden="true" />;
    case "error":
      return <XCircle className="size-4 text-red-400" aria-hidden="true" />;
  }
}

export function TriggerRunStatus({ userId }: { userId: string }) {
  const [status, setStatus] = useState<RunStatus>({ state: "idle" });

  // The real @trigger.dev/react-hooks package will type this more tightly;
  // the ambient declaration in src/types/trigger-react-hooks.d.ts bridges the
  // gap until the package is installed.
  const run = useRun(healthCheckTask, {
    payload: { userId },
    onSuccess: (output: unknown) => {
      setStatus({
        state: "success",
        output: output as Record<string, unknown>,
        finishedAt: new Date(),
      });
    },
    onError: (error: unknown) => {
      setStatus({
        state: "error",
        error: error instanceof Error ? error.message : String(error),
        finishedAt: new Date(),
      });
    },
  });

  const handleRun = useCallback(() => {
    setStatus({ state: "loading" });
    run();
  }, [run]);

  const finishedAtISO = status.state === "success" || status.state === "error"
    ? status.finishedAt.toISOString()
    : null;

  return (
    <section
      className="rounded-2xl border border-[#2A2A2E] bg-[#141414] p-5 shadow-card
             space-y-4"
      aria-labelledby="trigger-status-heading"
    >
      <header className="flex items-center justify-between">
        <h2
          id="trigger-status-heading"
          className="text-sm font-semibold uppercase tracking-widest text-[#CEFF00]"
        >
          Trigger.dev — health check
        </h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <StatusIcon state={status.state} />
          <span>{statusLabel(status.state)}</span>
        </div>
      </header>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Runs the{" "}
        <code className="rounded bg-[#2A2A2E] px-1 py-0.5 text-[11px] font-mono text-[#CEFF00]">
          health-check
        </code>{" "}
        task against user <code className="rounded bg-[#2A2A2E] px-1 py-0.5 text-[11px] font-mono text-[#CEFF00]">{userId}</code>{" "}
        on Trigger.dev and streams the result back here in real time.
      </p>

      {status.state === "success" ? (
        <pre className="overflow-auto rounded border border-border/60 bg-[#0B0B0B] p-3 text-[11px] leading-5 text-muted-foreground">
          {JSON.stringify(status.output, null, 2)}
        </pre>
      ) : status.state === "error" ? (
        <p className="text-xs text-red-400 break-words">{status.error}</p>
      ) : null}

      {finishedAtISO && (
        <p className="text-[11px] text-muted-foreground">
          Finished {new Date(new Date(finishedAtISO).getTime()).toLocaleTimeString()} ({finishedAtISO})
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-[#0B0B0B]
                     transition-colors
                     bg-[#CEFF00] text-[#0B0B0B] shadow-glow
                     hover:bg-[#b8e600] active:scale-[0.98]
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#CEFF00]
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CEFF00]/60"
          onClick={handleRun}
          disabled={status.state === "loading"}
        >
          <Loader2
            className={`size-4 transition-transform ${status.state === "loading" ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          {status.state === "loading" ? "Running…" : "Run now"}
        </button>
      </div>
    </section>
  );
}
