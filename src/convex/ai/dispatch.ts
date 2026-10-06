import type { CoachProviderId } from "../../lib/coach-core";
import { readProviderRegistry, requestChatCompletion, describeFailure, failureKindOf, type ProviderConfig, type ChatResult } from "./provider";
import { buildChain, orderChain } from "./router";

/** The result of a dispatch resolve: which provider answered, and whether it was a fallback. */
export interface DispatchResult {
  /** The config of the provider that answered. */
  used: ProviderConfig;
  attempts: number;
  fallbacks: string[];
  answer?: string;
}

/** Errors that should never trigger a provider fallback (provisional config). */
export function isFatalKind(kind: string): boolean {
  return kind === "auth" || kind === "invalid_request";
}

/** Kinds the dispatch policy is willing to fall back on. */
export const FALLBACK_KINDS: string[] = [
  "rate_limit",
  "timeout",
  "server_error",
  "network",
  "empty_response",
];

/** The provider actor: invoked once per chain step with the provider config, returning the rendered answer text or throwing a classified error. */
export type DispatchRequestActor = (config: ProviderConfig) => Promise<string>;

/** The shape passed to a provider request. */
export interface DispatchRequest {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxOutputTokens: number;
  temperature: number;
  timeoutMs: number;
}

/** Type guard: true for errors produced by the provider layer (they carry a `kind` string). */
export function isCoachError(error: unknown): error is Error & { kind: string } {
  return (
    error instanceof Error &&
    typeof (error as Error & { kind?: string }).kind === "string"
  );
}

/** Build a human-facing message from a provider failure. Never exposes keys. */
export { describeFailure } from "./provider";
export { readProviderRegistry } from "./provider";
export { requestChatCompletion } from "./provider";
export { failureKindOf } from "./provider";
export { buildChain, orderChain } from "./router";

/**
 * Walk a provider chain until one answers, classifying every failure.
 *
 * `options` carries the provider chain and the request. The `request` argument
 * is the provider actor: invoked once per step. Callers may pass a plain
 * fetch-based actor (the default `requestChatCompletion`) as a `DispatchRequest`,
 * or any injectable actor (tests) as `DispatchRequestActor`.
 *
 * Fallback semantics:
 *  - auth / invalid_request are fatal: wrapped in a DispatchError and thrown;
 *  - a timeout fails the provider once, which retries the SAME provider a second
 *    time before moving on to the next chain entry;
 *  - every other non-fatal failure (rate_limit, server_error, network, etc.)
 *    falls through to the next chain entry;
 *  - an empty (whitespace-only) answer is treated as a failure and falls through.
 */
export async function dispatchChat(
  options: {
    chain: Array<any>;
    request: DispatchRequest | DispatchRequestActor;
  },
): Promise<DispatchResult> {
  const { chain, request } = options;
  const fallbacks: string[] = [];
  let lastError: Error | undefined;
  let attempts = 0;

  for (const step of chain) {
    const config = step;
    const usedConfig = config as ProviderConfig;
    let retryThisProvider = false;

    // A single provider may retry once on timeout before we move on.
    for (;;) {
      try {
        attempts += 1;

        let result: string | ChatResult;
        const isCallable = typeof request === "function";
        if (isCallable) {
          result = await request(usedConfig);
        } else {
          result = (await requestChatCompletion(usedConfig, request)) as ChatResult;
        }

        const answer = typeof result === "string" ? result.trim() : (result as { text?: string }).text ?? "";

        if (!answer) {
          fallbacks.push(`${config.id}:empty_response`);
          // An empty reply is a failure: fall through to the next chain entry.
          break;
        }

        return { used: usedConfig, attempts, fallbacks, answer };
      } catch (err) {
        lastError = err as DispatchError;
        const failureKind = (() => {
          if (err && typeof err === "object" && err !== null && "kind" in err && typeof (err as DispatchError).kind === "string") {
            return (err as DispatchError).kind;
          }
          return "server_error";
        })();

        // Fatal kinds stop the chain entirely.
        if (isFatalKind(failureKind)) {
          throw new DispatchError((err as Error).message, failureKind, attempts);
        }

        if (failureKind === "timeout") {
          if (!retryThisProvider) {
            retryThisProvider = true;
            // Retry the SAME provider once.
            continue;
          }
          // Retry budget exhausted: move on to the next chain entry.
          fallbacks.push(`${config.id}:timeout`);
          break;
        }

        // Every other non-fatal failure falls through to the next chain entry.
        fallbacks.push(`${config.id}:${failureKind}`);
        break;
      }
    }
  }

  // Exhausted the chain with no usable answer.
  const message = lastError instanceof Error ? lastError.message : "The coach could not answer.";
  throw new DispatchError(message, "all_failed", attempts);
}

export class DispatchError extends Error {
  kind: string;
  attempts: number;
  constructor(message: string, failKind: string, attempts = 0) {
    super(message);
    this.name = "DispatchError";
    this.kind = failKind;
    this.attempts = attempts;
  }
}
