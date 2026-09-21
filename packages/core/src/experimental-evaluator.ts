import { z } from "zod";
import type { Experimental_CompositionEvaluator } from "./experimental-compose";

export interface Experimental_EvaluatorOptions {
  /** Server-side Vercel AI Gateway key. Never expose this in browser code. */
  apiKey: string;
  /** Gateway evaluation model identifier, for example typesafe-ai/jev. */
  model: string;
  /** Per-evaluation timeout in milliseconds. Default: 10000. */
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
}

const probability = z.number().min(0).max(1);
const responseSchema = z.object({
  answers: z.record(
    z.string(),
    z.object({ type: z.literal("choice"), choice: z.string() }),
  ),
  providerMetadata: z
    .object({
      typesafe: z
        .object({ confidence: z.record(z.string(), probability) })
        .optional(),
    })
    .optional(),
  usage: z
    .object({ inputTokens: z.number().int().nonnegative().optional() })
    .optional(),
});

/**
 * Experimental server-side choice evaluator using Vercel AI Gateway's v4 evaluation
 * transport. No AI SDK provider constructor or additional dependency is needed.
 */
export function experimental_createEvaluator(
  options: Experimental_EvaluatorOptions,
): Experimental_CompositionEvaluator {
  const apiKey = options.apiKey?.trim();
  if (!apiKey) throw new Error("A Vercel AI Gateway API key is required.");
  const timeoutMs = options.timeoutMs ?? 10000;
  if (
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 2147483647
  )
    throw new Error("timeoutMs must be an integer between 1 and 2147483647.");
  const fetch = options.fetch ?? globalThis.fetch;
  const model = options.model?.trim();
  if (!model)
    throw new Error("A Gateway evaluation model identifier is required.");
  return async ({ state, questions, signal }) => {
    signal.throwIfAborted();
    const controller = new AbortController();
    const abort = () => controller.abort(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(
      () =>
        controller.abort(
          new DOMException("Evaluation request timed out.", "TimeoutError"),
        ),
      timeoutMs,
    );
    try {
      const response = await fetch(
        "https://ai-gateway.vercel.sh/v4/ai/evaluation-model",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "ai-gateway-protocol-version": "0.0.1",
            "ai-gateway-auth-method": "api-key",
            "ai-evaluation-model-specification-version": "4",
            "ai-model-id": model,
          },
          body: JSON.stringify({ state, questions }),
          signal: controller.signal,
          cache: "no-store",
        },
      );
      if (!response.ok)
        throw new Error(`Evaluation request failed (HTTP ${response.status}).`);
      const result = responseSchema.safeParse(
        await response.json().catch(() => null),
      );
      if (!result.success)
        throw new Error("Evaluator returned an invalid evaluation response.");
      const answers = Object.fromEntries(
        Object.entries(questions).map(([name, question]) => {
          const answer = result.data.answers[name];
          if (!answer || !Object.hasOwn(question.criteria, answer.choice))
            throw new Error(
              "Evaluator returned a choice outside the offered criteria.",
            );
          return [
            name,
            {
              choice: answer.choice,
              confidence:
                result.data.providerMetadata?.typesafe?.confidence[name],
            },
          ];
        }),
      );
      return { answers, usage: result.data.usage };
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
    }
  };
}
