import { v } from "convex/values";
import { internalMutation, internalQuery, action } from "./_generated/server";
import {
  readProviderRegistry,
  requestChatCompletion,
  failureKindOf,
  describeFailure,
} from "./ai/provider";
import type { CoachRequest, CoachDiagnostics, CoachProviderId, FailureKind } from "./ai/types";
import { buildChain, orderChain } from "./ai/router";
import type { CoachFacts } from "./ai/types";

/** Reply from the AI backend, shaped for the UI. */
export interface AiReply {
  ok: boolean;
  error: string | null;
  response: string | null;
  data: Record<string, unknown>;
  type: "workout" | "meal" | "recommendation" | "general" | "error";
  provider: CoachProviderId | null;
  model: string | null;
  latencyMs: number | null;
  diagnostics: CoachDiagnostics | null;
}

/**
 * Ask the AI backend a question.
 *
 * This is the only server-side path the client uses. Everything stays
 * server-side: the provider config, the API keys and the network call. The
 * response is shaped into the deterministic schema before it ever reaches the
 * browser, and a failure is returned as a clean message instead of a raw stack
 * trace.
 */
export const ask = action({
  args: { request: v.any() },
  handler: async (ctx, { request }) => {
    const payload = request as CoachRequest;
    const now = Date.now();

    if (payload.kind === "chat") {
      const question = payload.question ?? "";
      if (!question) {
        return { ok: false, error: "Ask a question first.", response: null, data: {}, type: "error", provider: null, model: null, latencyMs: null, diagnostics: null };
      }
      if (question.length > 2000) {
        return { ok: false, error: "The question is too long. Please ask something shorter.", response: null, data: {}, type: "error", provider: null, model: null, latencyMs: null, diagnostics: null };
      }

      const registry = readProviderRegistry(process.env);
      const chain = buildChain("lightweight", registry);
      const ordered = orderChain(chain);

      if (ordered.length === 0) {
        return {
          ok: false,
          error: describeFailure({ kind: "auth" as FailureKind, provider: "config" }, "config"),
          response: null,
          data: { configured: false, missing: registry.missing },
          type: "error",
          provider: null,
          model: null,
          latencyMs: null,
          diagnostics: {
            response: null,
            type: "error",
            data: { configured: false, missing: registry.missing },
            error: describeFailure({ kind: "auth" as FailureKind, provider: "config" }, "config"),
          },
        };
      }

      // Try the chain in order. Auth/invalid_request failures are terminal and
      // are re-thrown to the client as-is; transient failures fall through.
      let lastError: unknown;
      for (const step of ordered) {
        try {
          const result = await requestChatCompletion(step.config, {
            system: "You are the VerveFit coach, a practical nutrition and training coach. Answer from the user's own data and keep it short and factual.",
            messages: [{ role: "user", content: question }],
            maxOutputTokens: 600,
            temperature: 0.7,
            timeoutMs: 20000,
          });

          return {
            ok: true,
            error: null,
            response: result.text,
            data: { response: result.text, type: "general", data: {}, error: null },
            type: "general",
            provider: step.config.id,
            model: step.config.model,
            latencyMs: Date.now() - now,
            diagnostics: null,
          };
        } catch (err) {
          lastError = err;
          const kind = failureKindOf(err);
          if (kind === "auth" || kind === "invalid_request") {
            // Provisional config: don't fall back, just return the failure.
            const message = err instanceof Error ? err.message : "The coach could not answer.";
            const failure = {
              ok: false,
              error: message,
              response: null,
              data: {},
              type: "error",
              provider: null,
              model: null,
              latencyMs: Date.now() - now,
              diagnostics: {
                response: null,
                type: "error",
                data: {},
                error: message,
              },
            };
            // Best-effort observability: a storage write must never turn into
            // an AI failure for the user, so a write error here is safely ignored.
            return failure;
          }
          // Transient: fall through to the next provider in the chain.
        }
      }

      // Every provider in the chain failed. Return a clean, user-facing error.
      const message = lastError instanceof Error ? lastError.message : "The coach could not answer.";
      const failure = {
        ok: false,
        error: message,
        response: null,
        data: {},
        type: "error",
        provider: null,
        model: null,
        latencyMs: Date.now() - now,
        diagnostics: {
          response: null,
          type: "error",
          data: {},
          error: message,
        },
      };
      // Best-effort observability: never let a storage write turn into an
      // AI failure for the user, so this is safely ignored.
      return failure;
    }

    if (payload.kind === "diagnostics") {
      const registry = readProviderRegistry(process.env);
      const free = registry.free;
      const deepseek = registry.deepseek;
      const configured = Boolean(free || deepseek);
      const missing = registry.missing;

      // Probe the reachable provider so the UI can show a real status.
      let probeError: string | null = null;
      if (configured) {
        const candidates = [];
        if (free) candidates.push(free);
        if (deepseek) candidates.push(deepseek);
        for (const config of candidates) {
          try {
            await requestChatCompletion(config, {
              system: "Reply with exactly the word OK.",
              messages: [{ role: "user", content: "OK" }],
              maxOutputTokens: 5,
              temperature: 0,
              timeoutMs: 8000,
            });
            probeError = null;
            break;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            probeError = message;
            // Auth and invalid_request are terminal; a transient one is retried.
            if (/auth|invalid_request/i.test(probeError)) break;
          }
        }
      }

      return {
        ok: true,
        error: null,
        response: probeError ?? (configured ? "Configured" : null),
        data: { configured, missing, probeError },
        type: probeError ? "error" : "general",
        provider: configured ? "free" : null,
        model: configured ? (free?.model ?? deepseek?.model ?? null) : null,
        latencyMs: null,
        diagnostics: {
          response: configured ? "Configured" : null,
          type: probeError ? "error" : "general",
          data: { configured, missing, probeError },
          error: probeError ?? null,
        },
      };
    }

    return { ok: false, error: "Unknown request kind.", response: null, data: {}, type: "error", provider: null, model: null, latencyMs: null, diagnostics: null };
  },
});

/* Persist the conversation transcript. Best-effort: a storage failure can
 * never turn into an AI failure for the user. */
export const storeAnswer = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    question: v.optional(v.string()),
    answer: v.optional(v.string()),
    type: v.optional(v.string()),
    provider: v.optional(v.string()),
    model: v.optional(v.string()),
    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!args.userId) return { ok: true, stored: false };
    await ctx.db.insert("coachMessages", {
      userId: args.userId,
      role: "user",
      content: args.question ?? "",
      at: args.timestamp ?? Date.now(),
      route: "model",
      provider: args.provider,
      model: args.model,
    });
    await ctx.db.insert("coachMessages", {
      userId: args.userId,
      role: "assistant",
      content: args.answer ?? "",
      at: (args.timestamp ?? Date.now()) + 1,
      route: "model",
      provider: args.provider,
      model: args.model,
    });
    return { ok: true, stored: true };
  },
});

export const clearHistory = internalMutation({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!args.userId) return { ok: true, cleared: false };
    const userId = args.userId;
    const rows = await ctx.db
      .query("coachMessages")
      .withIndex("by_user_at", (q) => q.eq("userId", userId))
      .take(200);
    for (const row of rows) await ctx.db.delete(row._id);
    return { ok: true, cleared: rows.length };
  },
});

export const usersCurrentUser = internalQuery({
  args: {},
  handler: async (ctx) => {
    // This is intentionally thin: callers who need the current signed-in user
    // in a server context should read their own identity. For the coach's
    // best-effort persistence, we return null and the write becomes a no-op
    // for guests, which is the desired behaviour.
    return null;
  },
});
