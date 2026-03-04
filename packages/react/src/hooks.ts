"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  Spec,
  UIElement,
  FlatElement,
  JsonPatch,
  SpecDataPart,
} from "@json-render/core";
import {
  setByPath,
  getByPath,
  addByPath,
  removeByPath,
  createMixedStreamParser,
  applySpecPatch,
  nestedToFlat,
  SPEC_DATA_PART_TYPE,
} from "@json-render/core";

/**
 * Token usage metadata from AI generation
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Parse result for a single line -- either a patch or usage metadata
 */
type ParsedLine =
  | { type: "patch"; patch: JsonPatch }
  | { type: "usage"; usage: TokenUsage }
  | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSpecLike(value: unknown): value is Spec {
  if (!isRecord(value)) return false;
  if (typeof value.root !== "string" || !isRecord(value.elements)) return false;
  for (const element of Object.values(value.elements)) {
    if (!isRecord(element)) return false;
    if (typeof element.type !== "string") return false;
    if (!isRecord(element.props)) return false;
    if (
      element.children !== undefined &&
      (!Array.isArray(element.children) ||
        element.children.some((c) => typeof c !== "string"))
    ) {
      return false;
    }
  }
  if (value.state !== undefined && !isRecord(value.state)) return false;
  return true;
}

function extractJsonObjects(text: string): string[] {
  const results: string[] = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let start = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
      continue;
    }

    if (ch === "}") {
      if (depth > 0) depth--;
      if (depth === 0 && start !== -1) {
        results.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }

  return results;
}

function parseFullSpecFromText(text: string): Spec | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Fast path: the entire response is a single JSON object
  try {
    const parsed = JSON.parse(trimmed);
    if (isSpecLike(parsed)) return parsed;
  } catch {
    // ignore
  }

  // Try fenced code blocks first
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)```/gi;
  let fenceMatch: RegExpExecArray | null = null;
  while ((fenceMatch = fenceRegex.exec(text)) !== null) {
    const candidate = fenceMatch[1]?.trim();
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate);
      if (isSpecLike(parsed)) return parsed;
    } catch {
      // ignore this fence block
    }
  }

  // Fallback: scan all top-level JSON objects in the response and pick spec-like object
  const objects = extractJsonObjects(text);
  for (const objText of objects) {
    try {
      const parsed = JSON.parse(objText);
      if (isSpecLike(parsed)) return parsed;
    } catch {
      // ignore invalid object candidates
    }
  }

  return null;
}

/**
 * Parse a single JSON line (patch or metadata)
 */
function parseLine(line: string): ParsedLine {
  try {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) {
      return null;
    }
    const parsed = JSON.parse(trimmed);

    // Check for usage metadata
    if (parsed.__meta === "usage") {
      return {
        type: "usage",
        usage: {
          promptTokens: parsed.promptTokens ?? 0,
          completionTokens: parsed.completionTokens ?? 0,
          totalTokens: parsed.totalTokens ?? 0,
        },
      };
    }

    return { type: "patch", patch: parsed as JsonPatch };
  } catch {
    return null;
  }
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
    const statePath = path.slice("/state".length); // e.g. "/posts"
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
    delete newSpec.state;
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
  if (path === "/state") return spec.state;
  if (path.startsWith("/state/") && spec.state) {
    const statePath = path.slice("/state".length);
    return getByPath(spec.state as Record<string, unknown>, statePath);
  }
  return getByPath(spec as unknown as Record<string, unknown>, path);
}

/**
 * Apply an RFC 6902 JSON patch to the current spec.
 * Supports add, remove, replace, move, copy, and test operations.
 */
function applyPatch(spec: Spec, patch: JsonPatch): Spec {
  const newSpec = {
    ...spec,
    elements: { ...spec.elements },
    ...(spec.state ? { state: { ...spec.state } } : {}),
  };

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
  /** Token usage from the last generation */
  usage: TokenUsage | null;
  /** Raw JSONL lines received from the stream (JSON patch lines) */
  rawLines: string[];
  /** Send a prompt to generate UI */
  send: (prompt: string, context?: Record<string, unknown>) => Promise<void>;
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
}: UseUIStreamOptions): UseUIStreamReturn {
  const [spec, setSpec] = useState<Spec | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [usage, setUsage] = useState<TokenUsage | null>(null);
  const [rawLines, setRawLines] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Keep refs to callbacks so `send` doesn't recreate when consumers
  // pass inline arrow functions.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const clear = useCallback(() => {
    setSpec(null);
    setError(null);
  }, []);

  const send = useCallback(
    async (prompt: string, context?: Record<string, unknown>) => {
      // Abort any existing request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setIsStreaming(true);
      setError(null);
      setUsage(null);
      setRawLines([]);

      // Start with previous spec if provided, otherwise empty spec
      const previousSpec = context?.previousSpec as Spec | undefined;
      let currentSpec: Spec =
        previousSpec && previousSpec.root
          ? { ...previousSpec, elements: { ...previousSpec.elements } }
          : { root: "", elements: {} };
      setSpec(currentSpec);

      try {
        const response = await fetch(api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            context,
            currentSpec,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          // Try to parse JSON error response for better error messages
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
        let fullResponse = "";
        let patchCount = 0;
        let sawAnyNonEmptyLine = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const decoded = decoder.decode(value, { stream: true });
          buffer += decoded;
          fullResponse += decoded;

          // Process complete lines
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            sawAnyNonEmptyLine = true;
            const result = parseLine(trimmed);
            if (!result) continue;
            if (result.type === "usage") {
              setUsage(result.usage);
            } else {
              setRawLines((prev) => [...prev, trimmed]);
              currentSpec = applyPatch(currentSpec, result.patch);
              setSpec({ ...currentSpec });
              patchCount++;
            }
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          const trimmed = buffer.trim();
          sawAnyNonEmptyLine = true;
          const result = parseLine(trimmed);
          if (result) {
            if (result.type === "usage") {
              setUsage(result.usage);
            } else {
              setRawLines((prev) => [...prev, trimmed]);
              currentSpec = applyPatch(currentSpec, result.patch);
              setSpec({ ...currentSpec });
              patchCount++;
            }
          }
        }

        if (patchCount === 0) {
          const fallbackSpec = parseFullSpecFromText(fullResponse);
          if (fallbackSpec) {
            setSpec(fallbackSpec);
            onCompleteRef.current?.(fallbackSpec);
            return;
          }
          const details = sawAnyNonEmptyLine
            ? "The model returned text that is not valid json-render JSONL patches."
            : "The model returned an empty response stream.";
          throw new Error(
            `${details} Try MODEL=gpt-5-mini or tighten the prompt.`,
          );
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
        setIsStreaming(false);
      }
    },
    [api],
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
    usage,
    rawLines,
    send,
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

// =============================================================================
// useBoundProp — Two-way binding helper for $bindState/$bindItem expressions
// =============================================================================

/**
 * Hook for two-way bound props. Returns `[value, setValue]` where:
 *
 * - `value` is the already-resolved prop value (passed through from render props)
 * - `setValue` writes back to the bound state path (no-op if not bound)
 *
 * Designed to work with the `bindings` map that the renderer provides when
 * a prop uses `{ $bindState: "/path" }` or `{ $bindItem: "field" }`.
 *
 * @example
 * ```tsx
 * import { useBoundProp } from "@json-render/react";
 *
 * const Input: ComponentRenderer = ({ props, bindings }) => {
 *   const [value, setValue] = useBoundProp<string>(props.value, bindings?.value);
 *   return <input value={value ?? ""} onChange={(e) => setValue(e.target.value)} />;
 * };
 * ```
 */
export function useBoundProp<T>(
  propValue: T | undefined,
  bindingPath: string | undefined,
): [T | undefined, (value: T) => void] {
  // Import useStateStore lazily to avoid circular dependency issues.
  // The hook is always called inside a StateProvider so this is safe.
  const { set } = useStateStoreFromContext();
  const setValue = useCallback(
    (value: T) => {
      if (bindingPath) set(bindingPath, value);
    },
    [bindingPath, set],
  );
  return [propValue, setValue];
}

// Re-export useStateStore access for useBoundProp without circular import
import { useStateStore as useStateStoreFromContext } from "./contexts/state";

// =============================================================================
// buildSpecFromParts — Derive Spec from AI SDK data parts
// =============================================================================

/**
 * A single part from the AI SDK's `message.parts` array. This is a minimal
 * structural type so that library helpers do not depend on the AI SDK.
 * Fields are optional because different part types carry different data:
 * - Text parts have `text`
 * - Data parts have `data`
 */
export interface DataPart {
  type: string;
  text?: string;
  data?: unknown;
}

/**
 * Build a `Spec` by replaying all spec data parts from a message's
 * parts array. Returns `null` if no spec data parts are present.
 *
 * This function is designed to work with the AI SDK's `UIMessage.parts` array.
 * It picks out parts whose `type` is {@link SPEC_DATA_PART_TYPE} and processes them based
 * on the payload's `type` discriminator:
 *
 * - `"patch"`: Applies the JSON Patch operation incrementally via `applySpecPatch`.
 * - `"flat"`: Replaces the spec with the complete flat spec.
 * - `"nested"`: Assigns the nested spec directly (future: nested-to-flat conversion).
 *
 * The function has no AI SDK dependency — it operates on a generic array of
 * `{ type: string; data: unknown }` objects.
 *
 * @example
 * ```tsx
 * const spec = buildSpecFromParts(message.parts);
 * if (spec) {
 *   return <MyRenderer spec={spec} />;
 * }
 * ```
 */
/**
 * Type guard that validates a data part payload looks like a valid
 * {@link SpecDataPart} before we cast it. Returns `false` (and the
 * part is silently skipped) for malformed payloads.
 */
function isSpecDataPart(data: unknown): data is SpecDataPart {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  switch (obj.type) {
    case "patch":
      return typeof obj.patch === "object" && obj.patch !== null;
    case "flat":
    case "nested":
      return typeof obj.spec === "object" && obj.spec !== null;
    default:
      return false;
  }
}

export function buildSpecFromParts(parts: DataPart[]): Spec | null {
  const spec: Spec = { root: "", elements: {} };
  let hasSpec = false;

  for (const part of parts) {
    if (part.type === SPEC_DATA_PART_TYPE) {
      if (!isSpecDataPart(part.data)) continue;
      const payload = part.data;
      if (payload.type === "patch") {
        hasSpec = true;
        applySpecPatch(spec, payload.patch);
      } else if (payload.type === "flat") {
        hasSpec = true;
        Object.assign(spec, payload.spec);
      } else if (payload.type === "nested") {
        hasSpec = true;
        const flat = nestedToFlat(payload.spec);
        Object.assign(spec, flat);
      }
    }
  }

  return hasSpec ? spec : null;
}

/**
 * Extract and join all text content from a message's parts array.
 *
 * Filters for parts with `type === "text"`, trims each one, and joins them
 * with double newlines so that text from separate agent steps renders as
 * distinct paragraphs in markdown.
 *
 * Has no AI SDK dependency — operates on a generic `DataPart[]`.
 *
 * @example
 * ```tsx
 * const text = getTextFromParts(message.parts);
 * if (text) {
 *   return <Streamdown>{text}</Streamdown>;
 * }
 * ```
 */
export function getTextFromParts(parts: DataPart[]): string {
  return parts
    .filter(
      (p): p is DataPart & { text: string } =>
        p.type === "text" && typeof p.text === "string",
    )
    .map((p) => p.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

// =============================================================================
// useJsonRenderMessage — extract spec + text from message parts
// =============================================================================

/**
 * Hook that extracts both the json-render spec and text content from a
 * message's parts array. Combines `buildSpecFromParts` and `getTextFromParts`
 * into a single call with memoized results.
 *
 * **Memoization behavior:** Results are recomputed only when the `parts` array
 * reference changes **and** either the length differs or the last element is a
 * different object. This is optimized for the typical AI SDK streaming pattern
 * where parts are appended incrementally. Mid-array edits (e.g. replacing an
 * earlier part without appending) may not trigger recomputation. If you need to
 * force a recompute after such edits, pass a new array reference with a
 * different last element.
 *
 * @example
 * ```tsx
 * import { useJsonRenderMessage } from "@json-render/react";
 *
 * function MessageBubble({ message }) {
 *   const { spec, text, hasSpec } = useJsonRenderMessage(message.parts);
 *
 *   return (
 *     <div>
 *       {text && <Markdown>{text}</Markdown>}
 *       {hasSpec && <MyRenderer spec={spec} />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useJsonRenderMessage(parts: DataPart[]) {
  const prevPartsRef = useRef<DataPart[]>([]);
  const prevResultRef = useRef<{ spec: Spec | null; text: string }>({
    spec: null,
    text: "",
  });

  // Recompute only when parts actually change (by length + last element identity).
  // AI SDK typically appends to the parts array during streaming, so checking
  // length and the last element covers both "new array reference with same
  // content" (no recompute) and "new part appended" (recompute).
  const partsChanged =
    parts !== prevPartsRef.current &&
    (parts.length !== prevPartsRef.current.length ||
      parts[parts.length - 1] !==
        prevPartsRef.current[prevPartsRef.current.length - 1]);

  if (partsChanged || prevPartsRef.current.length === 0) {
    prevPartsRef.current = parts;
    prevResultRef.current = {
      spec: buildSpecFromParts(parts),
      text: getTextFromParts(parts),
    };
  }

  const { spec, text } = prevResultRef.current;
  const hasSpec = spec !== null && Object.keys(spec.elements || {}).length > 0;
  return { spec, text, hasSpec };
}

// =============================================================================
// useChatUI — Chat + GenUI hook
// =============================================================================

/**
 * A single message in the chat, which may contain text, a rendered UI spec, or both.
 */
export interface ChatMessage {
  /** Unique message ID */
  id: string;
  /** Who sent this message */
  role: "user" | "assistant";
  /** Text content (conversational prose) */
  text: string;
  /** json-render Spec built from JSONL patches (null if no UI was generated) */
  spec: Spec | null;
}

/**
 * Options for useChatUI
 */
export interface UseChatUIOptions {
  /** API endpoint that accepts `{ messages: Array<{ role, content }> }` and returns a text stream */
  api: string;
  /** Callback when streaming completes for a message */
  onComplete?: (message: ChatMessage) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Return type for useChatUI
 */
export interface UseChatUIReturn {
  /** All messages in the conversation */
  messages: ChatMessage[];
  /** Whether currently streaming an assistant response */
  isStreaming: boolean;
  /** Error from the last request, if any */
  error: Error | null;
  /** Send a user message */
  send: (text: string) => Promise<void>;
  /** Clear all messages and reset the conversation */
  clear: () => void;
}

let chatMessageIdCounter = 0;
function generateChatId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  chatMessageIdCounter += 1;
  return `msg-${Date.now()}-${chatMessageIdCounter}`;
}

/**
 * Hook for chat + GenUI experiences.
 *
 * Manages a multi-turn conversation where each assistant message can contain
 * both conversational text and a json-render UI spec. The hook sends the full
 * message history to the API endpoint, reads the streamed response, and
 * separates text lines from JSONL patch lines using `createMixedStreamParser`.
 *
 * @example
 * ```tsx
 * const { messages, isStreaming, send, clear } = useChatUI({
 *   api: "/api/chat",
 * });
 *
 * // Send a message
 * await send("Compare weather in NYC and Tokyo");
 *
 * // Render messages
 * {messages.map((msg) => (
 *   <div key={msg.id}>
 *     {msg.text && <p>{msg.text}</p>}
 *     {msg.spec && <MyRenderer spec={msg.spec} />}
 *   </div>
 * ))}
 * ```
 */
export function useChatUI({
  api,
  onComplete,
  onError,
}: UseChatUIOptions): UseChatUIReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Keep a ref to the latest messages so `send` always reads the
  // current history, avoiding stale closure issues.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  // Keep refs to callbacks so `send` doesn't recreate when consumers
  // pass inline arrow functions.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      // Abort any existing request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      const userMessage: ChatMessage = {
        id: generateChatId(),
        role: "user",
        text: text.trim(),
        spec: null,
      };

      const assistantId = generateChatId();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        text: "",
        spec: null,
      };

      // Append user message and empty assistant placeholder
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);
      setError(null);

      // Build messages array for the API (full conversation history + new message).
      // Read from ref to always get the latest messages (avoids stale closure).
      const historyForApi = [
        ...messagesRef.current.map((m) => ({
          role: m.role,
          content: m.text,
        })),
        { role: "user" as const, content: text.trim() },
      ];

      // Mutable state for accumulating the assistant response
      let accumulatedText = "";
      let currentSpec: Spec = { root: "", elements: {} };
      let hasSpec = false;

      try {
        const response = await fetch(api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: historyForApi }),
          signal: abortControllerRef.current.signal,
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
            // Ignore JSON parsing errors
          }
          throw new Error(errorMessage);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();

        // Use createMixedStreamParser to classify lines
        const parser = createMixedStreamParser({
          onPatch(patch) {
            hasSpec = true;
            applySpecPatch(currentSpec, patch);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      spec: {
                        root: currentSpec.root,
                        elements: { ...currentSpec.elements },
                        ...(currentSpec.state
                          ? { state: { ...currentSpec.state } }
                          : {}),
                      },
                    }
                  : m,
              ),
            );
          },
          onText(line) {
            accumulatedText += (accumulatedText ? "\n" : "") + line;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, text: accumulatedText } : m,
              ),
            );
          },
        });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          parser.push(decoder.decode(value, { stream: true }));
        }
        parser.flush();

        // Build final message for onComplete callback
        const finalMessage: ChatMessage = {
          id: assistantId,
          role: "assistant",
          text: accumulatedText,
          spec: hasSpec
            ? {
                root: currentSpec.root,
                elements: { ...currentSpec.elements },
                ...(currentSpec.state
                  ? { state: { ...currentSpec.state } }
                  : {}),
              }
            : null,
        };
        onCompleteRef.current?.(finalMessage);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }
        const resolvedError =
          err instanceof Error ? err : new Error(String(err));
        setError(resolvedError);
        // Remove empty assistant message on error
        setMessages((prev) =>
          prev.filter((m) => m.id !== assistantId || m.text.length > 0),
        );
        onErrorRef.current?.(resolvedError);
      } finally {
        setIsStreaming(false);
      }
    },
    [api],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    messages,
    isStreaming,
    error,
    send,
    clear,
  };
}
