import { useState, useCallback, useRef, useEffect } from "react";
import type {
  Spec,
  UIElement,
  FlatElement,
  JsonPatch,
} from "@json-render/core";
import {
  setByPath,
  getByPath,
  removeByPath,
  validateSpec,
  autoFixSpec,
  formatSpecIssues,
} from "@json-render/core";

export { useBoundProp } from "@internal/react-state";

/**
 * Result of attempting to parse a JSONL line.
 * - `patch`: successfully parsed patch (or null)
 * - `malformed`: true only if the line looked like JSON (starts with `{`)
 *   but could not be parsed. Plain text commentary is NOT malformed.
 */
interface ParseResult {
  patch: JsonPatch | null;
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
 * Parse a single JSON patch line.
 * Includes recovery for common LLM JSON errors like trailing extra braces.
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
    return { patch: JSON.parse(trimmed) as JsonPatch, malformed: false };
  } catch {
    // Fall through to recovery
  }

  // Recovery: strip trailing extra braces/brackets one at a time
  // LLMs commonly generate extra closing characters in nested JSON
  let attempt = trimmed;
  for (let i = 0; i < 3; i++) {
    const last = attempt[attempt.length - 1];
    if (last === "}" || last === "]") {
      attempt = attempt.slice(0, -1);
      try {
        const result = JSON.parse(attempt) as JsonPatch;
        console.warn(
          `[json-render] Recovered malformed JSONL line by removing ${i + 1} trailing '${last}'`,
        );
        return { patch: result, malformed: false };
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

/**
 * Set a value at a spec path (for add/replace operations).
 */
function setSpecValue(newSpec: Spec, path: string, value: unknown): void {
  if (path === "/root") {
    newSpec.root = value as string;
    return;
  }

  if (path === "/state") {
    newSpec.state = value as Record<string, unknown>;
    return;
  }

  if (path.startsWith("/state/")) {
    if (!newSpec.state) newSpec.state = {};
    const statePath = path.slice("/state".length);
    setByPath(newSpec.state as Record<string, unknown>, statePath, value);
    return;
  }

  if (path.startsWith("/elements/")) {
    const pathParts = path.slice("/elements/".length).split("/");
    const elementKey = pathParts[0];
    if (!elementKey) return;

    if (pathParts.length === 1) {
      newSpec.elements[elementKey] = value as UIElement;
    } else {
      const element = newSpec.elements[elementKey];
      if (element) {
        const propPath = "/" + pathParts.slice(1).join("/");
        const newElement = { ...element };
        setByPath(
          newElement as unknown as Record<string, unknown>,
          propPath,
          value,
        );
        newSpec.elements[elementKey] = newElement;
      }
    }
  }
}

/**
 * Remove a value at a spec path.
 */
function removeSpecValue(newSpec: Spec, path: string): void {
  if (path === "/state") {
    newSpec.state = undefined;
    return;
  }

  if (path.startsWith("/state/") && newSpec.state) {
    const statePath = path.slice("/state".length);
    removeByPath(newSpec.state as Record<string, unknown>, statePath);
    return;
  }

  if (path.startsWith("/elements/")) {
    const pathParts = path.slice("/elements/".length).split("/");
    const elementKey = pathParts[0];
    if (!elementKey) return;

    if (pathParts.length === 1) {
      const { [elementKey]: _, ...rest } = newSpec.elements;
      newSpec.elements = rest;
    } else {
      const element = newSpec.elements[elementKey];
      if (element) {
        const propPath = "/" + pathParts.slice(1).join("/");
        const newElement = { ...element };
        removeByPath(
          newElement as unknown as Record<string, unknown>,
          propPath,
        );
        newSpec.elements[elementKey] = newElement;
      }
    }
  }
}

/**
 * Get a value at a spec path.
 */
function getSpecValue(spec: Spec, path: string): unknown {
  if (path === "/root") return spec.root;
  return getByPath(spec as unknown as Record<string, unknown>, path);
}

/**
 * Apply an RFC 6902 JSON patch to the current spec.
 * Supports add, remove, replace, move, copy, and test operations.
 */
function applyPatch(spec: Spec, patch: JsonPatch): Spec {
  const newSpec = { ...spec, elements: { ...spec.elements } };

  switch (patch.op) {
    case "add":
    case "replace": {
      setSpecValue(newSpec, patch.path, patch.value);
      break;
    }
    case "remove": {
      removeSpecValue(newSpec, patch.path);
      break;
    }
    case "move": {
      if (!patch.from) break;
      const moveValue = getSpecValue(newSpec, patch.from);
      removeSpecValue(newSpec, patch.from);
      setSpecValue(newSpec, patch.path, moveValue);
      break;
    }
    case "copy": {
      if (!patch.from) break;
      const copyValue = getSpecValue(newSpec, patch.from);
      setSpecValue(newSpec, patch.path, copyValue);
      break;
    }
    case "test": {
      // test is a no-op for rendering purposes (validation only)
      break;
    }
  }

  return newSpec;
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
   * React Native's built-in fetch does not support `response.body`
   * (ReadableStream). Pass a streaming-capable fetch here, e.g.
   * `import { fetch } from 'expo/fetch'`.
   *
   * Falls back to the global `fetch` if not provided.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetch?: (url: string, init?: any) => Promise<Response>;
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
  /** Raw JSONL lines received from the stream */
  rawLines: string[];
  /** Send a prompt to generate UI */
  send: (prompt: string, context?: Record<string, unknown>) => Promise<void>;
  /** Stop the current generation */
  stop: () => void;
  /** Clear the current spec */
  clear: () => void;
}

/**
 * Hook for streaming UI generation
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
  const [rawLines, setRawLines] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
  }, []);

  const clear = useCallback(() => {
    setSpec(null);
    setError(null);
    setRawLines([]);
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
        signal: abortControllerRef.current!.signal,
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

        const newLines: string[] = [];
        for (const line of lines) {
          if (line.trim()) {
            newLines.push(line);
          }
          const { patch, malformed } = parsePatchLine(line);
          if (patch) {
            currentSpec = applyPatch(currentSpec, patch);
            setSpec({ ...currentSpec });
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

        if (newLines.length > 0) {
          setRawLines((prev) => [...prev, ...newLines]);
        }
      }

      // Process any remaining buffer (only if stream completed naturally)
      if (!aborted && buffer.trim()) {
        setRawLines((prev) => [...prev, buffer]);
        const { patch, malformed } = parsePatchLine(buffer);
        if (patch) {
          currentSpec = applyPatch(currentSpec, patch);
          setSpec({ ...currentSpec });
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
      abortControllerRef.current = new AbortController();

      setIsStreaming(true);
      setError(null);
      setRawLines([]);

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
          // Post-stream: auto-fix deterministic issues. Lossless fixes (field
          // relocations) apply immediately. Lossy fixes (pruned content) are
          // held back while retries remain so validation fails and the model
          // is asked to repair; they apply as a last resort once retries are
          // exhausted, trading dropped content for a renderable spec.
          // ---------------------------------------------------------------
          const { spec: fixedSpec, fixDetails } = autoFixSpec(currentSpec, {
            lossy: retriesUsed >= maxRetries,
          });
          if (fixDetails.length > 0) {
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

          // Still has errors
          const errors = validation.issues.filter(
            (i) => i.severity === "error",
          );
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
            onError?.(validationError);
            return;
          }
        }

        onComplete?.(currentSpec);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      } finally {
        setIsStreaming(false);
      }
    },
    [
      api,
      fetchFn,
      onComplete,
      onError,
      enableValidation,
      maxRetries,
      streamRequest,
    ],
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
    rawLines,
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
      }
    } else {
      root = element.key;
    }
  }

  return { root, elements: elementMap };
}
