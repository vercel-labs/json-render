import { jsonSchema, Output, streamText, type JSONSchema7 } from "ai";
import { isNonEmptySpec } from "@json-render/core";
import { z } from "zod";
import { compactGeneration } from "./render/compact";

export function createCompactResponse(
  request: Request,
  prompt: unknown,
  previousSpec: unknown,
  model: string,
  rules: string[],
) {
  const input = z.string().trim().min(1).max(500).safeParse(prompt);
  if (!input.success)
    return Response.json(
      { error: "Enter a request between 1 and 500 characters." },
      { status: 400 },
    );
  if (previousSpec != null && !isNonEmptySpec(previousSpec))
    return Response.json(
      { error: "The selected version must be a valid spec." },
      { status: 400 },
    );

  const abort = new AbortController();
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: unknown) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        const result = streamText({
          model,
          providerOptions: { openai: { reasoningEffort: "none" } },
          abortSignal: AbortSignal.any([request.signal, abort.signal]),
          system: [compactGeneration.prompt, ...rules].join("\n"),
          prompt: previousSpec
            ? `Current UI:\n${JSON.stringify(previousSpec)}\n\nRequested change: ${input.data}\nReturn the complete updated UI in the compact schema, not patches.`
            : input.data,
          output: Output.object({
            name: "compact_ui",
            schema: jsonSchema(compactGeneration.jsonSchema as JSONSchema7),
          }),
        });
        for await (const part of result.fullStream) {
          if (part.type === "text-delta")
            send({ __meta: "compact", text: part.text });
          else if (part.type === "error") throw part.error;
        }
        await result.output;
        const usage = await result.usage;
        send({
          __meta: "usage",
          promptTokens: usage.inputTokens,
          completionTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
          cachedTokens: usage.inputTokenDetails?.cacheReadTokens ?? 0,
          cacheWriteTokens: usage.inputTokenDetails?.cacheWriteTokens ?? 0,
        });
      } catch (error) {
        if (!abort.signal.aborted && !request.signal.aborted)
          send({
            __meta: "error",
            message:
              error instanceof Error
                ? error.message
                : "Compact generation failed.",
          });
      } finally {
        if (!abort.signal.aborted) controller.close();
      }
    },
    cancel() {
      abort.abort();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
    },
  });
}
