// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { experimental_createEvaluator } from "./index";

const request = {
  state: { user_request: "Build a panel" },
  questions: {
    next: {
      type: "choice" as const,
      instructions: "Choose",
      criteria: { panel: "Panel" },
    },
  },
  signal: new AbortController().signal,
};
const payload = {
  answers: {
    next: { type: "choice", choice: "panel", probabilities: { panel: 0.6 } },
  },
  providerMetadata: { typesafe: { confidence: { next: 0.9 } } },
  usage: { inputTokens: 12 },
};

describe("experimental_createEvaluator", () => {
  it("uses Gateway with a plain model ID and normalizes native confidence", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json(payload),
    );
    const evaluate = experimental_createEvaluator({
      model: "typesafe-ai/jev",
      apiKey: "test-key",
      fetch,
    });
    expect(await evaluate(request)).toEqual({
      answers: { next: { choice: "panel", confidence: 0.9 } },
      usage: { inputTokens: 12 },
    });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://ai-gateway.vercel.sh/v4/ai/evaluation-model");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer test-key",
      "ai-model-id": "typesafe-ai/jev",
      "ai-evaluation-model-specification-version": "4",
    });
    expect(JSON.parse(init!.body as string)).toEqual({
      state: request.state,
      questions: request.questions,
    });
  });

  it("allows missing confidence and usage without inventing telemetry", async () => {
    const evaluate = experimental_createEvaluator({
      model: "typesafe-ai/jev",
      apiKey: "test",
      fetch: async () => Response.json({ answers: payload.answers }),
    });
    expect(await evaluate(request)).toEqual({
      answers: { next: { choice: "panel", confidence: undefined } },
      usage: undefined,
    });
  });

  it.each([
    {},
    { answers: {} },
    { answers: { next: { type: "choice", choice: "outside" } } },
    { ...payload, usage: { inputTokens: -1 } },
  ])("rejects malformed or unoffered decisions: %j", async (body) => {
    const evaluate = experimental_createEvaluator({
      model: "typesafe-ai/jev",
      apiKey: "test",
      fetch: async () => Response.json(body),
    });
    await expect(evaluate(request)).rejects.toThrow();
  });

  it("reports HTTP status without exposing provider error bodies", async () => {
    expect(() =>
      experimental_createEvaluator({ apiKey: "test", model: "" }),
    ).toThrow("A Gateway evaluation model identifier is required.");
    const evaluate = experimental_createEvaluator({
      model: "typesafe-ai/jev",
      apiKey: "test",
      fetch: async () =>
        new Response("sensitive upstream detail", { status: 403 }),
    });
    await expect(evaluate(request)).rejects.toThrow(
      "Evaluation request failed (HTTP 403).",
    );
    const malformed = experimental_createEvaluator({
      model: "typesafe-ai/jev",
      apiKey: "test",
      fetch: async () => new Response("sensitive non-JSON body"),
    });
    await expect(malformed(request)).rejects.toThrow(
      "Evaluator returned an invalid evaluation response.",
    );
    expect(() =>
      experimental_createEvaluator({ model: "typesafe-ai/jev", apiKey: " " }),
    ).toThrow("API key");
    expect(() =>
      experimental_createEvaluator({
        model: "typesafe-ai/jev",
        apiKey: "test",
        timeoutMs: 0,
      }),
    ).toThrow("timeoutMs");
  });

  it("propagates cancellation and enforces its per-call timeout", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async (_url, init) =>
        new Promise((_, reject) => {
          init!.signal!.addEventListener(
            "abort",
            () => reject(init!.signal!.reason),
            { once: true },
          );
        }),
    );
    const evaluate = experimental_createEvaluator({
      model: "typesafe-ai/jev",
      apiKey: "test",
      timeoutMs: 10,
      fetch,
    });
    await expect(evaluate(request)).rejects.toMatchObject({
      name: "TimeoutError",
    });
    const controller = new AbortController();
    const pending = evaluate({ ...request, signal: controller.signal });
    controller.abort(new Error("cancelled"));
    await expect(pending).rejects.toThrow("cancelled");
    const beforeCalls = fetch.mock.calls.length;
    await expect(
      evaluate({ ...request, signal: controller.signal }),
    ).rejects.toThrow("cancelled");
    expect(fetch).toHaveBeenCalledTimes(beforeCalls);
  });
});
