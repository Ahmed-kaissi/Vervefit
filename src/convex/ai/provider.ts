import type { CoachProviderId, FailureKind } from "./types";

export interface ProviderConfig {
  id: CoachProviderId;
  label: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Env var name that supplies apiKey, e.g. "FREE_AI_API_KEY". */
  keyEnv: string;
  /** Env var name that supplies the model id, optional. */
  modelEnv?: string;
}

/** Read the AI provider configuration out of the environment. Server-only. */
export function readProviderRegistry(env: NodeJS.ProcessEnv): {
  free: ProviderConfig | null;
  deepseek: ProviderConfig | null;
  missing: string[];
} {
  const freeKey = env.FREE_AI_API_KEY?.trim();
  const freeBase = env.FREE_AI_BASE_URL?.trim();
  const freeModel = env.FREE_AI_MODEL?.trim();
  const deepKey = env.DEEPSEEK_API_KEY?.trim();
  const deepBase = env.DEEPSEEK_BASE_URL?.trim();
  const deepModel = env.DEEPSEEK_MODEL?.trim();

  const missing: string[] = [];
  const free: ProviderConfig | null = freeKey
    ? (freeBase
        ? {
            id: "free",
            label: "Fast model (free tier)",
            baseUrl: freeBase,
            apiKey: freeKey,
            model: freeModel || "Qwen3-4B-Instruct-2507",
            keyEnv: "FREE_AI_API_KEY",
            modelEnv: "FREE_AI_MODEL",
          }
        : null)
    : null;

  const deepseek: ProviderConfig | null = deepKey
    ? {
        id: "deepseek",
        label: "DeepSeek",
        baseUrl: deepBase || "https://api.deepseek.com/v1",
        apiKey: deepKey,
        model: deepModel || "deepseek-flash",
        keyEnv: "DEEPSEEK_API_KEY",
        modelEnv: "DEEPSEEK_MODEL",
      }
    : null;

  if (!free) missing.push("FREE_AI_BASE_URL");
  if (deepseek && !deepBase) missing.push("DEEPSEEK_BASE_URL");

  return { free, deepseek, missing };
}

/** Kinds the dispatch policy is willing to fall back on. */
export const FALLBACK_KINDS: string[] = [
  "rate_limit",
  "timeout",
  "server_error",
  "network",
  "empty_response",
];

/** Type guard: true for provider-layer errors, which carry a `kind` string. */
export function isCoachError(
  error: unknown,
): error is Error & { kind: string } {
  return (
    error instanceof Error &&
    typeof (error as Error & { kind?: string }).kind === "string"
  );
}

/**
 * Classify a failure into a kind.
 *
 * Recognises a `kind` already attached to the error (as produced by the
 * provider layer, e.g. `requestChatCompletion`), and otherwise falls back to
 * heuristics on the error message / status text.
 */
export function failureKindOf(
  error: unknown,
): "timeout" | "rate_limit" | "auth" | "invalid_request" | "server_error" | "network" | "empty_response" {
  if (error instanceof Error) {
    const rawKind = (error as Error & { kind?: string }).kind;
    if (typeof rawKind === "string" && rawKind.length > 0) {
      const recognised: Record<string, true> = {
        timeout: true,
        rate_limit: true,
        auth: true,
        invalid_request: true,
        server_error: true,
        network: true,
        empty_response: true,
      };
      if (rawKind in recognised) return rawKind as FailureKind;
    }
    const text = error.message.toLowerCase();
    if (error.name === "AbortError" || /abort|timeout/i.test(text)) return "timeout";
    if (/rate limit|too many requests|429/i.test(text)) return "rate_limit";
    if (/unauthorized|forbidden|api key|401|403/i.test(text)) return "auth";
    if (/invalid request|unknown model|invalid model|400|404/i.test(text)) return "invalid_request";
    if (/server error|500|502|503|504/i.test(text)) return "server_error";
    if (/network|i\/o|fetch failed|econnrefused|enotfound|lookup failed/i.test(text)) return "network";
  }
  return "server_error";
}

/** Build a user-facing error message from a provider failure. Never exposes keys. */
export function describeFailure(error: unknown, provider: string): string {
  // Prefer the failure kind the provider layer attached to the error itself;
  // fall back to re-classifying a raw Error if none was set.
  const kindLabel = (error as Error & { kind?: string })?.kind;
  const kind = typeof kindLabel === "string" && kindLabel.length > 0
    ? kindLabel
    : failureKindOf(error);
  switch (kind) {
    case "auth":
      return "The coach could not sign in to its model. Please check your API key and try again.";
    case "rate_limit":
      return "The coach is busy right now. Please try again in a moment.";
    case "invalid_request":
      return "The coach could not understand that request. Please try again.";
    case "server_error":
      return "The coach is temporarily unavailable. Please try again.";
    case "network":
    case "timeout":
      return "The coach took too long to answer. Please try again, or ask something shorter.";
    case "empty_response":
      return "The coach returned an empty answer. Try rephrasing the question.";
    default:
      return "The coach could not answer that. Please try again.";
  }
}

/** A minimal fetch-like client for the chat completion API. */
export interface ChatRequest {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxOutputTokens: number;
  temperature: number;
  timeoutMs: number;
}

export interface ChatResult {
  text: string;
}

/**
 * Call a chat completion provider.
 *
 * This is the only place the project talks to an AI provider. The API key,
 * base URL and model id all stay on the server; the browser only receives the
 * raw text payload, which the rest of the app never sees raw.
 *
 * Returns the text directly on success, or throws a structured error on
 * failure so the caller can classify it without leaking internals.
 */
export async function requestChatCompletion(
  config: ProviderConfig,
  request: ChatRequest,
  fetchOverride?: typeof fetch,
): Promise<ChatResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), request.timeoutMs);
  try {
    const res = await (fetchOverride ?? fetch)(
      `${config.baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: request.system },
            ...request.messages,
          ],
          max_tokens: request.maxOutputTokens,
          temperature: request.temperature,
        }),
        signal: controller.signal,
      } as RequestInit,
    );
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        if (body?.error?.message) detail = body.error.message;
        else if (body?.error) detail = String(body.error);
      } catch {
        /* non-JSON error body */
      }      const err = new Error(detail) as Error & { kind: string };      // Map the HTTP status to a failure kind. The only provider-visible kinds
      // the UI distinguishes are rate_limit, auth and invalid_request;
      // everything else collapses to server_error so the retry policy can act.
      let kind: FailureKind;      if (res.status === 429) kind = "rate_limit";      else if (res.status === 401 || res.status === 403) kind = "auth";      else if (res.status === 400 || res.status === 404) kind = "invalid_request";      else if (res.status === 500 || res.status === 502 || res.status === 503 || res.status === 504) kind = "server_error";      else kind = "server_error";      err.kind = kind;      throw err;
    }
    const body = await res.json();
    const choice = body?.choices?.[0];
    if (!choice) {
      const err = new Error("The provider returned an empty completion.") as Error & { kind: string };
      err.kind = "empty_response";
      throw err;
    }
    const text = choice.message?.content?.trim();
    if (!text) {
      const err = new Error("The provider returned an empty completion.") as Error & { kind: string };
      err.kind = "empty_response";
      throw err;
    }
    return { text };
  } finally {
    clearTimeout(timer);
  }
}
