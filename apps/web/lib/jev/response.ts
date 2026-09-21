import { z } from "zod";
import { diffToPatches, type Spec } from "@json-render/core";
import { composeUI } from "./compose";

const inputSchema = z.object({ prompt: z.string().trim().min(1).max(1000) });
const previousSpecSchema = z
  .object({
    root: z.string().min(1),
    elements: z
      .record(
        z.string(),
        z
          .object({
            type: z.string(),
            props: z.record(z.string(), z.unknown()),
          })
          .passthrough(),
      )
      .refine((elements) => Object.keys(elements).length <= 100),
    state: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export function createCompositionResponse(
  request: Request,
  prompt: unknown,
  previousSpec?: unknown,
) {
  const input = inputSchema.safeParse({ prompt });
  if (!input.success)
    return Response.json(
      { error: "Enter a request between 1 and 1,000 characters." },
      { status: 400 },
    );
  const previous =
    previousSpec == null
      ? undefined
      : previousSpecSchema.safeParse(previousSpec);
  if (previous && !previous.success)
    return Response.json(
      {
        error:
          "The selected version must be a valid spec with at most 100 elements.",
      },
      { status: 400 },
    );
  const initialSpec = previous?.success ? (previous.data as Spec) : undefined;
  if (!process.env.JEV_AI_GATEWAY_API_KEY?.trim())
    return Response.json(
      {
        error:
          "Jev is temporarily unavailable. Choose the default model to continue.",
      },
      { status: 503 },
    );
  const encoder = new TextEncoder();
  const controller = new AbortController();
  const signal = AbortSignal.any([
    request.signal,
    controller.signal,
    AbortSignal.timeout(55000),
  ]);
  const stream = new ReadableStream({
    async start(output) {
      const send = (event: unknown) =>
        output.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      let lastSpec: Spec = initialSpec ?? { root: "", elements: {} };
      const sendSpec = (spec: Spec) => {
        for (const patch of diffToPatches(
          lastSpec as unknown as Record<string, unknown>,
          spec as unknown as Record<string, unknown>,
        ))
          send(patch);
        lastSpec = spec;
      };
      let decisions = 0;
      try {
        for await (const event of composeUI(
          input.data.prompt,
          signal,
          undefined,
          initialSpec,
        )) {
          if (event.type === "error") throw new Error(event.message);
          if (event.type === "step") {
            sendSpec(event.spec);
            send({ __meta: "decision", ...event.step });
            decisions++;
          } else {
            if (event.spec) sendSpec(event.spec);
            for (const step of event.steps.slice(decisions))
              send({ __meta: "decision", ...step });
            send({
              __meta: "composition",
              stopReason: event.stopReason,
              elapsedMs: event.elapsedMs,
              inputTokens: event.inputTokens,
              calls: event.steps.length,
              estimatedCostUsd: event.estimatedCostUsd,
            });
          }
        }
      } catch (error) {
        if (!controller.signal.aborted && !request.signal.aborted) {
          send({
            __meta: "error",
            message:
              error instanceof z.ZodError
                ? "Jev returned an invalid decision payload."
                : error instanceof Error
                  ? error.message
                  : "Composition failed.",
          });
        }
      } finally {
        if (!controller.signal.aborted) output.close();
      }
    },
    cancel() {
      controller.abort();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
    },
  });
}
