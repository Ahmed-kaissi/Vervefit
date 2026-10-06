/**
 * The coach contract: a small, predictable shape for every AI answer, plus
 * the structured failure the UI renders. Nothing here exposes Convex state or
 * provider secrets.
 */

/** Which layer the AI used, for the provenance badge. */
export type CoachProviderId = "deterministic" | "free" | "deepseek";

/** The kind of failure, matched by the server provider client. */
export type FailureKind =
  | "timeout"
  | "rate_limit"
  | "auth"
  | "invalid_request"
  | "server_error"
  | "network"
  | "empty_response";

/** A successful, validated AI reply. */
export interface CoachReply {
  /** Structured answer payload for predictive UI (chart labels, goal chips, etc.). */
  data: CoachData;
  /** The plain-text reply shown to the user. */
  response: string;
  type: "workout" | "meal" | "recommendation" | "general" | "error";
  provider: CoachProviderId;
  model: string | null;
  messageId: string;
  latencyMs: number | null;
}

/** Structured data the reply carries. The AI returns data; the UI renders data. */
export interface CoachData {
  response: string | null;
  type: "workout" | "meal" | "recommendation" | "general" | "error";
  data: Record<string, unknown>;
  error: string | null;
}

/** Structured failure shape, returned instead of a raw Convex stack trace. */
export interface CoachFailure {
  response: null;
  type: "error";
  data: null;
  error: string;
}

/** Everything the UI might want to know about the AI backend. */
export interface CoachDiagnostics {
  response: CoachReply["response"] | null;
  type: "workout" | "meal" | "recommendation" | "general" | "error";
  data: CoachReply["data"] | null;
  error: string | null;
}

/**
 * Request anything the AI backend can answer.
 *
 * Two endpoints:
 *  - `"diagnostics"` — is the provider configured and reachable.
 *  - `"chat"`        — send a question and get a structured reply.
 */
export interface CoachRequest {
  kind: "diagnostics" | "chat";
  question?: string;
}

/** A single turn in the conversation transcript. */
export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/** Map a safe question into a small structured payload the UI can predict. */
export function classifyReply(question: string): CoachData["type"] {
  const t = question.trim().toLowerCase();
  if (!t) return "general";
  if (/\b(calorie|kcal|protein|carb|fat|macro|water|hydration)\b/.test(t)) {
    return "recommendation";
  }
  if (/\b(workout|training|train|exercise|session|minutes|routine|split|program)\b/.test(t)) {
    return "workout";
  }
  if (/\b(meal|food|eat|dinner|lunch|breakfast|snack|recipe|protein dish)\b/.test(t)) {
    return "meal";
  }
  return "general";
}

/** Build a deterministic reply for the questions the app can answer from its own log. */
export function deterministicReply(
  intent: CoachData["type"],
  data: CoachData,
): CoachReply {
  // The deterministic layer is a UI convenience — the current design answers
  // lookups from the user's own numbers. This is kept fast, free and factual.
  return {
    data,
    response: "I can answer that straight from your log. Ask about calories, protein, water, meals, training or your goals.",
    type: "general",
    provider: "deterministic",
    model: "rules",
    messageId: `deterministic-${Date.now()}`,
    latencyMs: 1,
  };
}

/** Classify and format a provider response. Hardens the AI output so the UI is never handed an arbitrary string. */
export function classifyResponse(
  raw: string,
  provider: CoachProviderId,
  input: string,
): CoachReply {
  const text = raw.trim();
  const question = input.trim();

  if (!text) {
    return {
      data: { response: null, type: "error", data: {}, error: "The provider returned an empty answer. Please try again." },
      response: "AI is temporarily unavailable. Please try again.",
      type: "error",
      provider,
      model: null,
      messageId: `empty-${Date.now()}`,
      latencyMs: null,
    };
  }

  const type = classifyReply(question);

  return {
    data: { response: text, type, data: {}, error: null },
    response: text,
    type,
    provider,
    model: null,
    messageId: `reply-${Date.now()}`,
    latencyMs: null,
  };
}

/**
 * Turn any failure into a clean, user-facing error.
 *
 * Never exposes the provider's internal error, the Convex stack trace, or the
 * API key.
 */
export function failureToError(error: unknown): CoachFailure | null {
  if (error instanceof Error) {
    // The only deliberately surfaced raw text is the provider's own error
    // message, when it's already user-safe. Anything else is shown generically.
    const raw = error.message.toLowerCase();
    if (/timeout/i.test(raw)) {
      return { response: null, type: "error", data: null, error: "The coach took too long to answer. Try again, or ask something shorter." };
    }
    if (/rate limit/i.test(raw)) {
      return { response: null, type: "error", data: null, error: "The coach is rate limited right now. Give it a minute and try again." };
    }
    if (/unauthorized|forbidden|api key/i.test(raw)) {
      return { response: null, type: "error", data: null, error: "The coach's API key was rejected by the provider. Please try again later." };
    }
    if (/invalid request|unknown model|invalid model/i.test(raw)) {
      return { response: null, type: "error", data: null, error: "The coach is pointed at a model the provider doesn't recognise. Please try again later." };
    }
    if (/server error|500|502|503|504/i.test(raw)) {
      return { response: null, type: "error", data: null, error: "The coach is temporarily unavailable. Please try again." };
    }
    if (/empty response|no text/i.test(raw)) {
      return { response: null, type: "error", data: null, error: "The coach returned an empty answer. Try rephrasing the question." };
    }
  }

  return {
    response: null,
    type: "error",
    data: null,
    error: "AI is temporarily unavailable. Please try again.",
  };
}

/**
 * One half of a `sendMessage` outcome: a structured reply (chat) or a clean
 * failure. Unlike `CoachCallResult`, this shape also carries the diagnostics
 * fields a UI layer reads after asking whether the backend is configured.
 */
export interface SendMessageResult {
  /** Plain-text reply shown to the user. */
  response: string | null;
  /** Parsed answer category, e.g. "general" / "workout"." */
  type: CoachReply["type"];
  /** Structured payload the UI renders (diagnostics config, chart labels...). */
  data: Record<string, unknown> | null;
  /** Structured failure, never a provider or Convex stack trace. */
  error: string | null;
  /** Stable id for the turn, used to key the transcript entry. */
  messageId: string;
  /** Latency in milliseconds." */
  latencyMs: number | null;
  /** Diagnostics fields, only present for a `"diagnostics"` request. */
  configured?: boolean;
  missing?: string[];  /** The model available for low-effort ("lightweight") questions. */
  lightweight?: {
    model: string;
  };
  /** The model available for higher-effort ("reasoning") questions. */
  reasoning?: {
    model: string;
  };
  /** The provider and model that produced a chat answer (for the transcript). */
  provider?: string;
  model?: string;
}

/** The shape of the AI backend's configuration status, consumed by the coach UI. */
export type CoachStatus = SendMessageResult;

/** The result of a `sendMessage` call, either a validated reply or a structured failure. */
export interface CoachCallResult {
  response: CoachReply["response"] | null;
  type: CoachReply["type"];
  data: CoachReply["data"] | null;
  error: string | null;
}

/**
 * Send a request to the AI backend.
 *
 * The client never builds a prompt and never calls a provider directly — a
 * secured server function does that so the provider keys and the Convex URL
 * stay out of the browser bundle. This function POSTs the request to the
 * server and returns a validated reply or a clean, user-safe failure.
 */
export async function sendMessage(
  request: CoachRequest,
): Promise<SendMessageResult> {
  const  convexUrl =
    (import.meta as any).env.VITE_CONVEX_URL?.trim() ||
    (typeof window !== "undefined" ? window.localStorage.getItem("vervefit-convex-url") : null);
  if (!convexUrl) {
    return {
      response: null,
      type: "general",
      data: null,
      error: "The AI coach is not configured. Please set your Convex URL.",
      messageId: `unconfigured-${Date.now()}`,
      latencyMs: null,
    };
  }

  const payload:
    | { kind: "chat"; question: string }
    | { kind: "diagnostics" } =
    request.kind === "chat"
      ? { kind: "chat", question: request.question! }
      : { kind: "diagnostics" };

  const res = await fetch(`${convexUrl}/convex/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    return {
      response: null,
      type: "error",
      data: null,
      error: `The AI coach is unreachable right now (${res.status}).`,
      messageId: `unreachable-${Date.now()}`,
      latencyMs: null,
    };
  }

  const payloadJson = (await res.json()) as {
    ok: boolean;
    error: string | null;
    response: string | null;
    type: string;
    data: Record<string, unknown> | null;
    messageId?: string;
    latencyMs?: number | null;
    configured?: boolean;
    missing?: string[];
    provider?: string;
    model?: string;
  };

  return {
    response: payloadJson.response,
    type: payloadJson.type as CoachReply["type"],
    data: payloadJson.data,
    error: payloadJson.error ?? null,
    messageId: payloadJson.messageId ?? `reply-${Date.now()}`,
    latencyMs: payloadJson.latencyMs ?? null,
    ...(payloadJson.configured !== undefined && { configured: payloadJson.configured }),
    ...(payloadJson.missing !== undefined && { missing: payloadJson.missing }),
    ...(payloadJson.provider !== undefined && { provider: payloadJson.provider }),
    ...(payloadJson.model !== undefined && { model: payloadJson.model }),
  };
}