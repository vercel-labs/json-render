import { useState, useCallback, useRef, useEffect } from "react";
import type {
  Spec,
  UIElement,
  FlatElement,
  SpecStreamLine,
} from "@json-render/core";
import {
  applySpecPatch,
  validateSpec,
  autoFixSpec,
  formatSpecIssues,
} from "@json-render/core";
import { useStateStore } from "./contexts/state";

// =============================================================================
// useBoundProp — Two-way binding helper for $bindState/$bindItem expressions
// =============================================================================

/**
 * Hook for two-way bound props. Returns `[value, setValue]` where:
 *
 * - `value` is the already-resolved prop value (passed through from render props)
 * - `setValue` writes back to the bound state path (no-op if not bound)
 *
 * @example
 * ```tsx
 * const [value, setValue] = useBoundProp<string>(element.props.value, bindings?.value);
 * ```
 */
export function useBoundProp<T>(
  propValue: T | undefined,
  bindingPath: string | undefined,
): [T | undefined, (value: T) => void] {
  const { set } = useStateStore();
  const setValue = useCallback(
    (value: T) => {
      if (bindingPath) set(bindingPath, value);
    },
    [bindingPath, set],
  );
  return [propValue, setValue];
}

/**
 * Result of attempting to parse a JSONL line.
 * - `patch`: successfully parsed patch (or null)
 * - `malformed`: true only if the line looked like JSON (starts with `{`)
 *   but could not be parsed. Plain text commentary is NOT malformed.
 */
interface ParseResult {
  patch: SpecStreamLine | null;
  malformed: boolean;
}

/**
 * Check if a line looks like it's attempting to be JSON.
 * LLMs often output commentary text before/between patches — those
 * lines should be skipped, not treated as malformed.
 */
function looksLikeJson(line: string): boolean {
  return line.startsWith("{") || line.startsWith("[");
}

/**
 * Parse a single JSON patch line with LLM-specific recovery.
 * Wraps core's parseSpecStreamLine with recovery for common LLM errors
 * like trailing extra braces.
 *
 * Returns a ParseResult so the caller can distinguish between:
 * - Successfully parsed patch
 * - Commentary text (skip silently)
 * - Genuinely malformed JSON (trigger retry)
 */
function parsePatchLine(line: string): ParseResult {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("//")) {
    return { patch: null, malformed: false };
  }

  // If it doesn't look like JSON at all, it's commentary — skip it
  if (!looksLikeJson(trimmed)) {
    return { patch: null, malformed: false };
  }

  // Try parsing as-is first
  try {
    const parsed = JSON.parse(trimmed);
    // Validate it's a patch operation (must have `op` field)
    if (parsed && typeof parsed === "object" && typeof parsed.op === "string") {
      return { patch: parsed as SpecStreamLine, malformed: false };
    }
    // Valid JSON but not a patch — skip (could be metadata)
    return { patch: null, malformed: false };
  } catch {
    // Fall through to recovery
  }

  // Recovery: strip trailing extra braces/brackets one at a time
  // LLMs commonly generate extra closing characters in nested JSON
  let attempt = trimmed;
  for (let i = 0; i < 8; i++) {
    const last = attempt[attempt.length - 1];
    if (last === "}" || last === "]") {
      attempt = attempt.slice(0, -1);
      try {
        const result = JSON.parse(attempt);
        // Validate that the parsed result is actually a patch operation
        if (
          result &&
          typeof result === "object" &&
          typeof result.op === "string"
        ) {
          console.warn(
            `[json-render] Recovered malformed JSONL line by removing ${i + 1} trailing '${last}'`,
          );
          return { patch: result as SpecStreamLine, malformed: false };
        }
        // Valid JSON but not a patch — treat as malformed
        return { patch: null, malformed: true };
      } catch {
        // Keep stripping
      }
    } else {
      break;
    }
  }

  // Looks like JSON but couldn't parse — genuinely malformed
  return { patch: null, malformed: true };
}

// =============================================================================
// Stream result types
// =============================================================================

/** Result of a single stream request */
interface StreamResult {
  /** The spec after applying all successfully parsed patches */
  spec: Spec;
  /** Whether the stream completed naturally (vs. being aborted) */
  completed: boolean;
  /** Malformed lines that could not be parsed (even after recovery) */
  malformedLines: string[];
}

/**
 * Options for useUIStream
 */
export interface UseUIStreamOptions {
  /** API endpoint */
  api: string;
  /** Callback when complete */
  onComplete?: (spec: Spec) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /**
   * Custom fetch implementation with ReadableStream support.
   *
   * Falls back to the global `fetch` if not provided.
   */
  fetch?: (url: string, init?: RequestInit) => Promise<Response>;
  /**
   * Enable validation and auto-repair.
   *
   * When true:
   * - **Mid-stream**: Each JSONL line is validated as it arrives. If a line
   *   is malformed JSON (and recovery fails), the stream is aborted
   *   immediately and a repair prompt is sent to continue generation.
   * - **Post-stream**: After the stream completes, structural validation
   *   runs (missing children, visible-in-props, etc.). Issues that can be
   *   auto-fixed are fixed locally; remaining errors trigger a repair prompt.
   *
   * Defaults to false.
   */
  validate?: boolean;
  /**
   * Maximum number of automatic repair retries (covers both mid-stream
   * and post-stream retries combined). Defaults to 5.
   */
  maxRetries?: number;
}

/**
 * Return type for useUIStream
 */
export interface UseUIStreamReturn {
  /** Current UI spec */
  spec: Spec | null;
  /** Whether currently streaming */
  isStreaming: boolean;
  /** Error if any */
  error: Error | null;
  /** Send a prompt to generate UI */
  send: (prompt: string, context?: Record<string, unknown>) => Promise<void>;
  /** Stop the current generation */
  stop: () => void;
  /** Clear the current spec */
  clear: () => void;
}

/**
 * Hook for streaming UI generation via JSONL patches.
 *
 * @example
 * ```tsx
 * const { spec, isStreaming, send } = useUIStream({
 *   api: "/api/generate-ui",
 *   onComplete: (spec) => console.log("Done!", spec),
 * });
 *
 * // Trigger generation
 * await send("Create a dashboard with stats");
 *
 * // Render the spec
 * <Renderer spec={spec} loading={isStreaming} />
 * ```
 */
export function useUIStream({
  api,
  onComplete,
  onError,
  fetch: fetchFn = globalThis.fetch,
  validate: enableValidation = false,
  maxRetries = 5,
}: UseUIStreamOptions): UseUIStreamReturn {
  const [spec, setSpec] = useState<Spec | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Tracks the current request so only the latest one updates isStreaming.
  const requestIdRef = useRef(0);

  // Use refs for callbacks to avoid stale closures and unnecessary
  // re-creation of `send` when consumers pass inline arrow functions.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clear = useCallback(() => {
    setSpec(null);
    setError(null);
  }, []);

  /**
   * Stream a single request. Returns the result including whether the
   * stream completed and any malformed lines encountered.
   *
   * When `abortOnMalformed` is true, the stream is aborted on the first
   * malformed line so the caller can retry immediately.
   */
  const streamRequest = useCallback(
    async (
      prompt: string,
      context: Record<string, unknown> | undefined,
      initialSpec: Spec,
      abortOnMalformed: boolean,
      controller: AbortController,
    ): Promise<StreamResult> => {
      let currentSpec = initialSpec;
      setSpec(currentSpec);
      const malformedLines: string[] = [];

      const response = await fetchFn(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          context,
          currentSpec,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorMessage = `HTTP error: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Ignore JSON parsing errors, use default message
        }
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let aborted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const decoded = decoder.decode(value, { stream: true });
        buffer += decoded;

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const { patch, malformed } = parsePatchLine(line);
          if (patch) {
            // applySpecPatch mutates in place — deep-clone so React
            // never sees mutated objects from a previous render.
            currentSpec = applySpecPatch(structuredClone(currentSpec), patch);
            setSpec(currentSpec);
          } else if (malformed) {
            // Genuinely malformed JSON (started with { but couldn't parse)
            malformedLines.push(line.trim());

            if (abortOnMalformed) {
              await reader.cancel();
              aborted = true;
              break;
            }
          }
          // else: commentary text — skip silently
        }

        if (aborted) break;
      }

      // Process any remaining buffer (only if stream completed naturally)
      if (!aborted && buffer.trim()) {
        const { patch, malformed } = parsePatchLine(buffer);
        if (patch) {
          currentSpec = applySpecPatch(structuredClone(currentSpec), patch);
          setSpec(currentSpec);
        } else if (malformed) {
          malformedLines.push(buffer.trim());
        }
      }

      return { spec: currentSpec, completed: !aborted, malformedLines };
    },
    [api, fetchFn],
  );

  const send = useCallback(
    async (prompt: string, context?: Record<string, unknown>) => {
      // Abort any existing request
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const thisRequestId = ++requestIdRef.current;

      setIsStreaming(true);
      setError(null);

      // Start with previous spec if provided, otherwise empty spec
      const previousSpec = context?.previousSpec as Spec | undefined;
      let currentSpec: Spec =
        previousSpec && previousSpec.root
          ? { ...previousSpec, elements: { ...previousSpec.elements } }
          : { root: "", elements: {} };

      let retriesUsed = 0;
      let currentPrompt = prompt;
      let currentContext = context;

      try {
        // Retry loop handles both mid-stream (malformed JSON) and
        // post-stream (structural validation) repairs.
        while (retriesUsed <= maxRetries) {
          const result = await streamRequest(
            currentPrompt,
            currentContext,
            currentSpec,
            enableValidation, // only abort on malformed when validation is on
            controller,
          );
          currentSpec = result.spec;

          // ---------------------------------------------------------------
          // Mid-stream repair: stream was aborted due to malformed line
          // ---------------------------------------------------------------
          if (!result.completed && result.malformedLines.length > 0) {
            if (retriesUsed >= maxRetries) {
              break;
            }
            retriesUsed++;

            // Build a repair prompt that asks the AI to continue from
            // the current partial spec
            currentContext = { ...context, previousSpec: currentSpec };
            currentPrompt =
              `The previous generation contained malformed JSON that could not be parsed. The line was:\n` +
              `${result.malformedLines[result.malformedLines.length - 1]?.slice(0, 500)}\n\n` +
              `The current spec state is provided. Continue generating from where you left off. ` +
              `Output ONLY the remaining patches needed to complete the UI.`;
            continue;
          }

          // ---------------------------------------------------------------
          // Post-stream: validation is off or spec is empty → done
          // ---------------------------------------------------------------
          if (!enableValidation || !currentSpec.root) {
            break;
          }

          // ---------------------------------------------------------------
          // Post-stream: auto-fix deterministic issues (no retry needed)
          // ---------------------------------------------------------------
          const { spec: fixedSpec, fixes } = autoFixSpec(currentSpec);
          if (fixes.length > 0) {
            currentSpec = fixedSpec;
            setSpec({ ...currentSpec });
          }

          // ---------------------------------------------------------------
          // Post-stream: structural validation
          // ---------------------------------------------------------------
          const validation = validateSpec(currentSpec);
          if (validation.valid) {
            break;
          }

          // Still has errors — check if max retries exhausted
          if (retriesUsed >= maxRetries) {
            break;
          }

          retriesUsed++;
          const issueText = formatSpecIssues(validation.issues);

          currentContext = { ...context, previousSpec: currentSpec };
          currentPrompt =
            `FIX THE FOLLOWING ERRORS in the current UI spec. Output ONLY the patches needed to fix these issues, do not recreate the entire UI.\n\n` +
            issueText;
          // continue loop
        }

        // If retries were exhausted and validation still fails, report error
        // instead of silently treating partial/invalid specs as complete.
        if (enableValidation && retriesUsed >= maxRetries && currentSpec.root) {
          const finalValidation = validateSpec(currentSpec);
          if (!finalValidation.valid) {
            const issueText = formatSpecIssues(finalValidation.issues);
            const validationError = new Error(
              `Spec validation failed after ${maxRetries} retries:\n${issueText}`,
            );
            setError(validationError);
            onErrorRef.current?.(validationError);
            return;
          }
        }

        onCompleteRef.current?.(currentSpec);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onErrorRef.current?.(error);
      } finally {
        // Only the latest request updates isStreaming to avoid the race
        // where an aborted request's finally clears streaming for the active one.
        if (requestIdRef.current === thisRequestId) {
          setIsStreaming(false);
        }
      }
    },
    [api, fetchFn, enableValidation, maxRetries, streamRequest],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    spec,
    isStreaming,
    error,
    send,
    stop,
    clear,
  };
}

/**
 * Convert a flat element list to a Spec.
 * Input elements use key/parentKey to establish identity and relationships.
 * Output spec uses the map-based format where key is the map entry key
 * and parent-child relationships are expressed through children arrays.
 */
export function flatToTree(elements: FlatElement[]): Spec {
  const elementMap: Record<string, UIElement> = {};
  let root = "";

  // First pass: add all elements to map
  for (const element of elements) {
    elementMap[element.key] = {
      type: element.type,
      props: element.props,
      children: [],
      visible: element.visible,
    };
  }

  // Second pass: build parent-child relationships
  for (const element of elements) {
    if (element.parentKey) {
      const parent = elementMap[element.parentKey];
      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(element.key);
      } else {
        console.warn(
          `[json-render] flatToTree: element "${element.key}" references parent "${element.parentKey}" which does not exist. Element will be orphaned.`,
        );
      }
    } else {
      if (root) {
        console.warn(
          `[json-render] flatToTree: multiple root elements found ("${root}" and "${element.key}"). Using "${element.key}" as root.`,
        );
      }
      root = element.key;
    }
  }

  return { root, elements: elementMap };
}
