import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useFoodLog } from "@/hooks/use-food-log";
import { useHabits } from "@/hooks/use-habits";
import { useWater } from "@/hooks/use-water";
import { useWorkouts } from "@/hooks/use-body";
import { todayStr } from "@/lib/nutrition";
import {
  sendMessage,
  type CoachMessage,
  type CoachReply,
  type CoachDiagnostics,
  type SendMessageResult,
} from "@/lib/coach-core";

/** Browsing-friendly coach tier; the server decides the real provider. */
export type CoachTier = "auto" | "fast" | "deep";

export type CoachTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
  model?: string;
  at?: number;
};

export type CoachStatus = {
  configured: boolean;
  missing: string[];
  lightweight?: {
    model: string;
  };
  reasoning?: {
    model: string;
  };
};

export interface CoachState {
  isGuest: boolean;
  isAuthenticated: boolean;
  messages: CoachTurn[];
  sending: boolean;
  sendingText: string | null;
  error: string | null;
  diagnostics: SendMessageResult | null;
  status: CoachStatus | null;
  configured: boolean | null;
  checking: boolean;
  tier: CoachTier;
  setTier: (tier: CoachTier) => void;
  send: (question: string) => Promise<void>;
  reset: () => Promise<void>;
  suggestions: string[];
  /** Whether the AI provider is configured. Reads from the server at mount and on login. */
  isConfigured: () => Promise<void>;
}

/**
 * Drives the AI coach tab.
 *
 * The client never builds a prompt and never calls the AI provider directly —
 * a secured server function does that so the API keys stay out of the browser.
 * The AI reply (or a structured failure) is returned to the UI, and only
 * successful answers are persisted to Convex when the user is signed in.
 */
export function useCoach(): CoachState {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const isGuest = !authLoading && !isAuthenticated;
  const date = todayStr();
  const { totals, targets, entries } = useFoodLog(date);
  const { streak } = useHabits();
  const { ml, targetMl } = useWater();
  const { sessions } = useWorkouts(7, date);

  const [tier, setTier] = useState<CoachTier>("auto");
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [sendingText, setSendingText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<SendMessageResult | null>(null);
  const [status, setStatus] = useState<{
    configured: boolean;
    missing: string[];
  } | null>(null);
  const [checking, setChecking] = useState(true);

  const suggestions = useMemo(() => {
    const kcalTarget = targets.dailyCalorieTarget ?? 2000;
    const kcalPct =
      kcalTarget > 0 ? Math.min(totals.calories / kcalTarget, 1) : 0;
    const waterPct = targetMl > 0 ? Math.min(ml / targetMl, 1) : 0;
    const minutes = sessions.reduce((a, s) => a + s.minutes, 0);

    const out: string[] = [];
    if (entries.length === 0) {
      out.push("I haven't logged anything today — what should I eat?");
    } else if (kcalPct < 0.4) {
      out.push(`I'm ${Math.round((1 - kcalPct) * kcalTarget)} kcal under target. What should I eat next?`);
    } else if (kcalPct > 0.95) {
      out.push("I've gone over my calories today. Am I okay?");
    } else {
      out.push("How am I tracking against my targets today?");
    }
    if (totals.proteinG < targets.proteinTargetG) {
      out.push(`I need ${Math.round(targets.proteinTargetG - totals.proteinG)}g more protein — quick ideas?`);
    }
    if (streak > 0) {
      out.push(`How do I keep my ${streak}-day streak alive?`);
    } else {
      out.push("How do I build a consistent routine?");
    }
    if (ml < targetMl) {
      out.push("How much water is left today?");
    }
    if (minutes === 0) {
      out.push("What training should I do today?");
    }
    out.push("Is my main goal the right one for where I'm at?");
    return out.slice(0, 4);
  }, [entries.length, totals.calories, targets.dailyCalorieTarget, totals.proteinG, targets.proteinTargetG, streak, ml, targetMl, sessions]);

  // Ask the server whether the AI backend is configured.
  useEffect(() => {
    if (!isAuthenticated) {
      setStatus(null);
      setChecking(false);
      return;
    }
    let cancelled = false;
    sendMessage({ kind: "diagnostics" })
      .then((r) => {
        if (cancelled) return;
        setDiagnostics(r);
        setStatus({ configured: r.configured ?? false, missing: r.missing ?? [] });
      })
      .catch(() => {
        if (cancelled) return;
        setDiagnostics({ response: null, type: "error", data: null, error: "AI is temporarily unavailable. Please try again.", messageId: `offline-${Date.now()}`, latencyMs: null });
        setStatus({ configured: false, missing: [] });
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const send = useCallback(
    async (question: string) => {
      const text = question.trim();
      if (!text || sending) return;
      setError(null);
      setDiagnostics(null);
      setSendingText(text);
      setSending(true);
      try {
        const reply = await sendMessage({ kind: "chat", question: text });
        // Only persist a real answer (not a structured failure) so the
        // transcript is never polluted with empty/retries, and only for
        // authenticated users.
        if (reply.type === "error") {
          setError(reply.error ?? "AI is temporarily unavailable. Please try again.");
          return;
        }
        setMessages((prev) => [
          ...prev,
          { id: reply.messageId, role: "user", content: text },
          { id: reply.messageId + "-a", role: "assistant", content: reply.response ?? "", provider: reply.provider, model: reply.model, at: Date.now() },
        ]);
        if (isAuthenticated) {
          // Best-effort server-side persistence is handled by the AI backend.
          // A storage failure can never turn into an AI failure for the user.
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "AI is temporarily unavailable. Please try again.",
        );
      } finally {
        setSendingText(null);
        setSending(false);
      }
    },
    [isAuthenticated, sending],
  );

  const reset = useCallback(async () => {
    setError(null);
    setDiagnostics(null);
    if (isAuthenticated) {
      // Best-effort server-side clear is handled by the AI backend. On the
      // client we simply drop the UI transcript.
      setMessages([]);
    } else {
      setMessages([]);
    }
  }, [isAuthenticated]);

  return {
    isGuest,
    isAuthenticated,
    messages,
    sending,
    sendingText,
    error,
    diagnostics,
    status,
    configured: status?.configured ?? null,
    checking,
    tier,
    setTier,
    send,
    reset,
    suggestions,
    isConfigured: async () => {
      const result = await sendMessage({ kind: "diagnostics" });
      setDiagnostics(result);
      setStatus({ configured: result.configured ?? false, missing: result.missing ?? [] });
    },
  };
}
