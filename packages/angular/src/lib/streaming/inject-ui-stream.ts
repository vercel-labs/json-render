import { DestroyRef, inject, signal, type Signal } from "@angular/core";
import { applySpecPatch } from "@json-render/core";
import type { JsonPatch, Spec } from "@json-render/core";

import type { TokenUsage } from "./parts";

/** Options for {@link injectUIStream}. */
export interface UseUIStreamOptions {
  /** API endpoint that returns a JSONL patch stream. */
  api: string;
  /** Called with the final spec when the stream completes. */
  onComplete?: (spec: Spec) => void;
  /** Called on error. */
  onError?: (error: Error) => void;
}

/** Reactive result of {@link injectUIStream}. */
export interface UseUIStreamReturn {
  /** Current UI spec (null before the first patch). */
  spec: Signal<Spec | null>;
  /** Whether a stream is in flight. */
  isStreaming: Signal<boolean>;
  /** Last error, if any. */
  error: Signal<Error | null>;
  /** Token usage from the last generation. */
  usage: Signal<TokenUsage | null>;
  /** Raw JSONL patch lines received. */
  rawLines: Signal<string[]>;
  /** Send a prompt to generate UI. */
  send: (prompt: string, context?: Record<string, unknown>) => Promise<void>;
  /** Clear the current spec and error. */
  clear: () => void;
}

type ParsedLine =
  | { type: "patch"; patch: JsonPatch }
  | { type: "usage"; usage: TokenUsage }
  | null;

function parseLine(line: string): ParsedLine {
  try {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) {
      return null;
    }
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (parsed["__meta"] === "usage") {
      return {
        type: "usage",
        usage: {
          promptTokens: (parsed["promptTokens"] as number) ?? 0,
          completionTokens: (parsed["completionTokens"] as number) ?? 0,
          totalTokens: (parsed["totalTokens"] as number) ?? 0,
        },
      };
    }
    return { type: "patch", patch: parsed as unknown as JsonPatch };
  } catch {
    return null;
  }
}

/**
 * Streaming UI generation. The Angular equivalent of the baseline renderers'
 * `useUIStream`. Call in an injection context; returns signals plus a `send`
 * method. The in-flight request is aborted automatically on destroy.
 */
export function injectUIStream(options: UseUIStreamOptions): UseUIStreamReturn {
  const { api, onComplete, onError } = options;

  const spec = signal<Spec | null>(null);
  const isStreaming = signal(false);
  const error = signal<Error | null>(null);
  const usage = signal<TokenUsage | null>(null);
  const rawLines = signal<string[]>([]);

  let abortController: AbortController | null = null;

  inject(DestroyRef).onDestroy(() => abortController?.abort());

  const clear = (): void => {
    spec.set(null);
    error.set(null);
  };

  const send = async (
    prompt: string,
    context?: Record<string, unknown>,
  ): Promise<void> => {
    abortController?.abort();
    abortController = new AbortController();

    isStreaming.set(true);
    error.set(null);
    usage.set(null);
    rawLines.set([]);

    const previousSpec = context?.["previousSpec"] as Spec | undefined;
    let currentSpec: Spec =
      previousSpec && previousSpec.root
        ? { ...previousSpec, elements: { ...previousSpec.elements } }
        : { root: "", elements: {} };
    spec.set(currentSpec);

    const applyParsed = (result: Exclude<ParsedLine, null>, line: string) => {
      if (result.type === "usage") {
        usage.set(result.usage);
      } else {
        rawLines.update((prev) => [...prev, line]);
        currentSpec = applySpecPatch(currentSpec, result.patch);
        spec.set({ ...currentSpec });
      }
    };

    try {
      const response = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, context, currentSpec }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const result = parseLine(trimmed);
          if (result) applyParsed(result, trimmed);
        }
      }
      if (buffer.trim()) {
        const result = parseLine(buffer.trim());
        if (result) applyParsed(result, buffer.trim());
      }

      onComplete?.(currentSpec);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return;
      }
      const resolved = err instanceof Error ? err : new Error(String(err));
      error.set(resolved);
      onError?.(resolved);
    } finally {
      isStreaming.set(false);
    }
  };

  return {
    spec: spec.asReadonly(),
    isStreaming: isStreaming.asReadonly(),
    error: error.asReadonly(),
    usage: usage.asReadonly(),
    rawLines: rawLines.asReadonly(),
    send,
    clear,
  };
}

async function readError(response: Response): Promise<string> {
  let message = `HTTP error: ${response.status}`;
  try {
    const data = (await response.json()) as Record<string, unknown>;
    if (typeof data["message"] === "string") {
      message = data["message"];
    } else if (typeof data["error"] === "string") {
      message = data["error"];
    }
  } catch {
    // ignore parse failures, keep default message
  }
  return message;
}
