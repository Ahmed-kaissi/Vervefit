import { describe, expect, test } from "bun:test";
import {
  DispatchError,
  buildChain,
  dispatchChat,
  failureKindOf,
  isFatalKind,
} from "../src/convex/ai/dispatch";
import {
  FALLBACK_KINDS,
  describeFailure,
  isCoachError,
  readProviderRegistry,
  requestChatCompletion,
  type ProviderConfig,
} from "../src/convex/ai/provider";

const free: ProviderConfig = {
  id: "free",
  label: "Fast model",
  baseUrl: "https://free.example/v1",
  apiKey: "free-key",
  model: "Qwen3-4B-Instruct-2507",
  keyEnv: "FREE_AI_API_KEY",
  modelEnv: "FREE_AI_MODEL",
};

const deep: ProviderConfig = {
  id: "deepseek",
  label: "DeepSeek",
  baseUrl: "https://api.deepseek.com/v1",
  apiKey: "deep-key",
  model: "deepseek-flash",
  keyEnv: "DEEPSEEK_API_KEY",
  modelEnv: "DEEPSEEK_MODEL",
};

const ok = (text: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), {
    status: 200,
  });

describe("provider configuration", () => {
  test("reads both layers from the environment", () => {
    const registry = readProviderRegistry({
      FREE_AI_API_KEY: "k",
      FREE_AI_BASE_URL: "https://free.example/v1",
      DEEPSEEK_API_KEY: "d",
    });
    expect(registry.free?.model).toBe("Qwen3-4B-Instruct-2507");
    expect(registry.deepseek?.model).toBe("deepseek-flash");
    expect(registry.deepseek?.baseUrl).toBe("https://api.deepseek.com/v1");
  });

  test("respects an explicit model override", () => {
    const registry = readProviderRegistry({
      DEEPSEEK_API_KEY: "d",
      DEEPSEEK_MODEL: "some-new-flash",
      DEEPSEEK_BASE_URL: "https://proxy.example/v1",
    });
    expect(registry.deepseek?.model).toBe("some-new-flash");
    expect(registry.deepseek?.baseUrl).toBe("https://proxy.example/v1");
  });

  test("reports a half-configured free layer instead of pretending it works", () => {
    const registry = readProviderRegistry({ FREE_AI_API_KEY: "k" });
    expect(registry.free).toBeNull();
    expect(registry.missing).toContain("FREE_AI_BASE_URL");
  });

  test("no keys means no providers", () => {
    const registry = readProviderRegistry({});
    expect(registry.free).toBeNull();
    expect(registry.deepseek).toBeNull();
  });
});

describe("chain selection", () => {
  test("lightweight questions prefer the free model", () => {
    expect(buildChain("lightweight", { free, deepseek: deep }).map((c) => c.id)).toEqual([
      "free",
      "deepseek",
    ]);
  });

  test("reasoning questions prefer the strong model", () => {
    expect(buildChain("reasoning", { free, deepseek: deep }).map((c) => c.id)).toEqual([
      "deepseek",
      "free",
    ]);
  });

  test("a missing provider is simply skipped", () => {
    expect(buildChain("reasoning", { free: null, deepseek: deep }).map((c) => c.id)).toEqual([
      "deepseek",
    ]);
  });

  test("the chain never repeats a provider", () => {
    const chain = buildChain("lightweight", { free, deepseek: deep });
    expect(new Set(chain.map((c) => c.id)).size).toBe(chain.length);
  });
});

describe("failure classification", () => {
  async function expectKind(
    status: number,
    kind: string,
  ): Promise<void> {
    try {
      await requestChatCompletion(
        free,
        {
          system: "s",
          messages: [],
          maxOutputTokens: 10,
          temperature: 0,
          timeoutMs: 1000,
        },
        (async () => new Response("nope", { status })) as unknown as typeof fetch,
      );
      throw new Error("expected the request to fail");
    } catch (error) {
      expect(isCoachError(error)).toBe(true);
      expect(failureKindOf(error)).toBe(kind);
    }
  }

  test("401 is an auth failure", () => expectKind(401, "auth"));
  test("403 is an auth failure", () => expectKind(403, "auth"));
  test("429 is a rate limit", () => expectKind(429, "rate_limit"));
  test("400 is an invalid request", () => expectKind(400, "invalid_request"));
  test("404 (unknown model) is an invalid request", () =>
    expectKind(404, "invalid_request"));
  test("500 is a server error", () => expectKind(500, "server_error"));

  test("only auth and invalid_request are fatal", () => {
    expect(isFatalKind("auth")).toBe(true);
    expect(isFatalKind("invalid_request")).toBe(true);
    expect(isFatalKind("timeout")).toBe(false);
    expect(isFatalKind("rate_limit")).toBe(false);
    expect(isFatalKind("unknown")).toBe(false);
  });

  test("user-facing messages never contain a key", () => {
    const message = describeFailure(
      Object.assign(new Error("bad"), { kind: "auth", provider: "free" }),
    );
    expect(message).not.toContain("free-key");
    expect(message.toLowerCase()).toContain("api key");
  });
});

describe("requestChatCompletion", () => {
  test("returns the first text part", async () => {
    const result = await requestChatCompletion(
      free,
      {
        system: "s",
        messages: [{ role: "user", content: "hi" }],
        maxOutputTokens: 10,
        temperature: 0,
        timeoutMs: 1000,
      },
      (async () => ok("  hello there  ")) as unknown as typeof fetch,
    );
    expect(result.text).toBe("hello there");
  });

  test("an empty completion is a failure, not an empty answer", async () => {
    try {
      await requestChatCompletion(
        free,
        {
          system: "s",
          messages: [],
          maxOutputTokens: 10,
          temperature: 0,
          timeoutMs: 1000,
        },
        (async () =>
          new Response(JSON.stringify({ choices: [] }), {
            status: 200,
          })) as unknown as typeof fetch,
      );
      throw new Error("expected a failure");
    } catch (error) {
      expect(failureKindOf(error)).toBe("empty_response");
    }
  });

  test("a network error is classified as network", async () => {
    try {
      await requestChatCompletion(
        free,
        {
          system: "s",
          messages: [],
          maxOutputTokens: 10,
          temperature: 0,
          timeoutMs: 1000,
        },
        (async () => {
          throw new TypeError("fetch failed");
        }) as unknown as typeof fetch,
      );
      throw new Error("expected a failure");
    } catch (error) {
      expect(failureKindOf(error)).toBe("network");
    }
  });

  test("an aborted request is classified as a timeout", async () => {
    try {
      await requestChatCompletion(
        free,
        {
          system: "s",
          messages: [],
          maxOutputTokens: 10,
          temperature: 0,
          timeoutMs: 10,
        },
        ((_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => {
              const err = new Error("aborted");
              err.name = "AbortError";
              reject(err);
            });
          })) as unknown as typeof fetch,
      );
      throw new Error("expected a failure");
    } catch (error) {
      expect(failureKindOf(error)).toBe("timeout");
    }
  });
});

describe("dispatch policy", () => {
  test("uses the first provider when it succeeds", async () => {
    const result = await dispatchChat({
      chain: [free, deep],
      request: async () => "from free",
    });
    expect(result.used.id).toBe("free");
    expect(result.attempts).toBe(1);
    expect(result.fallbacks).toEqual([]);
  });

  test("a rate-limited free tier falls through to the strong model", async () => {
    const seen: string[] = [];
    const result = await dispatchChat({
      chain: [free, deep],
      request: async (config) => {
        seen.push(config.id);
        if (config.id === "free") {
          throw Object.assign(new Error("slow down"), {
            kind: "rate_limit",
            provider: "free",
          });
        }
        return "from deep";
      },
    });
    expect(result.used.id).toBe("deepseek");
    expect(seen).toEqual(["free", "deepseek"]);
    expect(result.fallbacks).toEqual(["free:rate_limit"]);
    expect(result.attempts).toBe(2);
  });

  test("an auth error aborts the chain instead of fanning out", async () => {
    const seen: string[] = [];
    try {
      await dispatchChat({
        chain: [free, deep],
        request: async (config) => {
          seen.push(config.id);
          throw Object.assign(new Error("bad key"), {
            kind: "auth",
            provider: config.id,
          });
        },
      });
      throw new Error("expected a DispatchError");
    } catch (error) {
      expect(error).toBeInstanceOf(DispatchError);
      // One attempt only: a rejected key will fail identically everywhere.
      expect(seen).toEqual(["free"]);
    }
  });

  test("a timeout retries the same provider exactly once", async () => {
    let attempts = 0;
    const result = await dispatchChat({
      chain: [free, deep],
      request: async () => {
        attempts += 1;
        if (attempts === 1) {
          throw Object.assign(new Error("timed out"), {
            kind: "timeout",
            provider: "free",
          });
        }
        return "second try";
      },
    });
    expect(result.answer).toBe("second try");
    expect(result.used.id).toBe("free");
    expect(attempts).toBe(2);
  });

  test("a persistent timeout moves on to the next provider", async () => {
    const seen: string[] = [];
    const result = await dispatchChat({
      chain: [free, deep],
      request: async (config) => {
        seen.push(config.id);
        if (config.id === "free") {
          throw Object.assign(new Error("timed out"), {
            kind: "timeout",
            provider: "free",
          });
        }
        return "from deep";
      },
    });
    expect(seen).toEqual(["free", "free", "deepseek"]);
    expect(result.used.id).toBe("deepseek");
  });

  test("total attempts stay bounded by the chain, so one question can never run away", async () => {
    let attempts = 0;
    try {
      await dispatchChat({
        chain: [free, deep],
        request: async () => {
          attempts += 1;
          throw Object.assign(new Error("boom"), {
            kind: "server_error",
            provider: "x",
          });
        },
      });
    } catch (error) {
      expect(error).toBeInstanceOf(DispatchError);
    }
    // 1 attempt each + the single timeout retry budget on the first provider.
    expect(attempts).toBeLessThanOrEqual(3);
  });

  test("an empty answer is treated as a failure and falls through", async () => {
    const result = await dispatchChat({
      chain: [free, deep],
      request: async (config) => (config.id === "free" ? "   " : "from deep"),
    });
    expect(result.used.id).toBe("deepseek");
    expect(result.fallbacks).toEqual(["free:empty_response"]);
  });

  test("an empty chain fails fast instead of looping", async () => {
    try {
      await dispatchChat({ chain: [], request: async () => "never" });
      throw new Error("expected a DispatchError");
    } catch (error) {
      expect(error).toBeInstanceOf(DispatchError);
      expect((error as DispatchError).attempts).toBe(0);
    }
  });

  test("every fallback kind is one the policy intends to fall back on", () => {
    expect(FALLBACK_KINDS).toContain("rate_limit");
    expect(FALLBACK_KINDS).toContain("timeout");
    expect(FALLBACK_KINDS).not.toContain("auth");
  });
});
