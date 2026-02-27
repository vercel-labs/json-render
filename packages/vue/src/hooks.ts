import {
  ref,
  shallowRef,
  computed,
  onUnmounted,
  isRef,
  type Ref,
  type ComputedRef,
} from "vue";
import { useStateStore } from "./composables/state";
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
  spec: Ref<Spec | null>;
  /** Whether currently streaming */
  isStreaming: Ref<boolean>;
  /** Error if any */
  error: Ref<Error | null>;
  /** Token usage from the last generation */
  usage: Ref<TokenUsage | null>;
  /** Raw JSONL lines received from the stream (JSON patch lines) */
  rawLines: Ref<string[]>;
  /** Send a prompt to generate UI */
  send: (prompt: string, context?: Record<string, unknown>) => Promise<void>;
  /** Clear the current spec */
  clear: () => void;
}

/**
 * Composable for streaming UI generation
 */
export function useUIStream({
  api,
  onComplete,
  onError,
}: UseUIStreamOptions): UseUIStreamReturn {
  const spec = shallowRef<Spec | null>(null);
  const isStreaming = ref(false);
  const error = ref<Error | null>(null);
  const usage = ref<TokenUsage | null>(null);
  const rawLines = ref<string[]>([]);

  const onCompleteRef = ref(onComplete);
  const onErrorRef = ref(onError);

  let abortController: AbortController | null = null;

  const clear = () => {
    spec.value = null;
    error.value = null;
    usage.value = null;
    rawLines.value = [];
  };

  const send = async (
    prompt: string,
    context?: Record<string, unknown>,
  ): Promise<void> => {
    // Abort any existing request
    abortController?.abort();
    abortController = new AbortController();

    isStreaming.value = true;
    error.value = null;
    usage.value = null;
    rawLines.value = [];

    // Start with previous spec if provided, otherwise empty spec
    const previousSpec = context?.previousSpec as Spec | undefined;
    let currentSpec: Spec =
      previousSpec && previousSpec.root
        ? { ...previousSpec, elements: { ...previousSpec.elements } }
        : { root: "", elements: {} };
    spec.value = currentSpec;

    try {
      const response = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          context,
          currentSpec,
        }),
        signal: abortController.signal,
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const result = parseLine(trimmed);
          if (!result) continue;
          if (result.type === "usage") {
            usage.value = result.usage;
          } else {
            rawLines.value = [...rawLines.value, trimmed];
            currentSpec = applyPatch(currentSpec, result.patch);
            spec.value = { ...currentSpec };
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const trimmed = buffer.trim();
        const result = parseLine(trimmed);
        if (result) {
          if (result.type === "usage") {
            usage.value = result.usage;
          } else {
            rawLines.value = [...rawLines.value, trimmed];
            currentSpec = applyPatch(currentSpec, result.patch);
            spec.value = { ...currentSpec };
          }
        }
      }

      onCompleteRef.value?.(currentSpec);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return;
      }
      const resolvedError = err instanceof Error ? err : new Error(String(err));
      error.value = resolvedError;
      onErrorRef.value?.(resolvedError);
    } finally {
      isStreaming.value = false;
    }
  };

  // Cleanup on unmount
  onUnmounted(() => {
    abortController?.abort();
  });

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
 * Composable for two-way bound props. Returns `[value, setValue]` where:
 *
 * - `value` is the already-resolved prop value (passed through from render props)
 * - `setValue` writes back to the bound state path (no-op if not bound)
 *
 * Designed to work with the `bindings` map that the renderer provides when
 * a prop uses `{ $bindState: "/path" }` or `{ $bindItem: "field" }`.
 *
 * @example
 * ```ts
 * import { useBoundProp } from "@json-render/vue";
 *
 * const Input: ComponentFn<AppCatalog, "Input"> = ({ props, bindings }) => {
 *   const [value, setValue] = useBoundProp<string>(props.value as string, bindings?.value);
 *   return h("input", { value: value ?? "", onInput: (e) => setValue(e.target.value) });
 * };
 * ```
 */
export function useBoundProp<T>(
  propValue: T | undefined,
  bindingPath: string | undefined,
): [T | undefined, (value: T) => void] {
  const { set } = useStateStore();
  return [
    propValue,
    (value: T) => {
      if (bindingPath) set(bindingPath, value);
    },
  ];
}

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
 * Type guard that validates a data part payload looks like a valid
 * SpecDataPart before we cast it.
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

/**
 * Build a `Spec` by replaying all spec data parts from a message's
 * parts array. Returns `null` if no spec data parts are present.
 *
 * Works with the AI SDK's `UIMessage.parts` array. Picks out parts whose
 * `type` is `SPEC_DATA_PART_TYPE` and processes them based on the payload's
 * `type` discriminator: `"patch"`, `"flat"`, or `"nested"`.
 */
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
 * Composable that extracts both the json-render spec and text content from a
 * message's parts array. Accepts a plain `DataPart[]` or a `Ref<DataPart[]>`
 * for reactive use in streaming scenarios.
 *
 * Returns `ComputedRef`s that recompute whenever `parts` changes.
 *
 * @example
 * ```ts
 * import { useJsonRenderMessage } from "@json-render/vue";
 *
 * const { spec, text, hasSpec } = useJsonRenderMessage(message.parts);
 * ```
 */
export function useJsonRenderMessage(parts: DataPart[] | Ref<DataPart[]>): {
  spec: ComputedRef<Spec | null>;
  text: ComputedRef<string>;
  hasSpec: ComputedRef<boolean>;
} {
  const partsRef = isRef(parts) ? parts : ref(parts);
  const spec = computed(() => buildSpecFromParts(partsRef.value));
  const text = computed(() => getTextFromParts(partsRef.value));
  const hasSpec = computed(
    () =>
      spec.value !== null && Object.keys(spec.value.elements || {}).length > 0,
  );
  return { spec, text, hasSpec };
}

// =============================================================================
// useChatUI — Chat + GenUI composable
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
  messages: Ref<ChatMessage[]>;
  /** Whether currently streaming an assistant response */
  isStreaming: Ref<boolean>;
  /** Error from the last request, if any */
  error: Ref<Error | null>;
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
 * Composable for chat + GenUI experiences.
 *
 * Manages a multi-turn conversation where each assistant message can contain
 * both conversational text and a json-render UI spec. Sends the full message
 * history to the API endpoint, reads the streamed response, and separates
 * text lines from JSONL patch lines using `createMixedStreamParser`.
 *
 * @example
 * ```ts
 * const { messages, isStreaming, send, clear } = useChatUI({ api: "/api/chat" });
 *
 * await send("Compare weather in NYC and Tokyo");
 * ```
 */
export function useChatUI({
  api,
  onComplete,
  onError,
}: UseChatUIOptions): UseChatUIReturn {
  const messages = ref<ChatMessage[]>([]);
  const isStreaming = ref(false);
  const error = ref<Error | null>(null);

  const onCompleteRef = ref(onComplete);
  const onErrorRef = ref(onError);

  let abortController: AbortController | null = null;

  const clear = () => {
    messages.value = [];
    error.value = null;
  };

  const send = async (text: string): Promise<void> => {
    if (!text.trim()) return;

    // Abort any existing request
    abortController?.abort();
    abortController = new AbortController();

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
    messages.value = [...messages.value, userMessage, assistantMessage];
    isStreaming.value = true;
    error.value = null;

    // Build messages array for the API (full conversation history + new message).
    // Vue refs are always current — no stale closure issue unlike React useRef.
    const historyForApi = [
      ...messages.value
        .filter((m) => m.id !== assistantId)
        .map((m) => ({ role: m.role, content: m.text })),
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
        signal: abortController.signal,
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
          messages.value = messages.value.map((m) =>
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
          );
        },
        onText(line) {
          accumulatedText += (accumulatedText ? "\n" : "") + line;
          messages.value = messages.value.map((m) =>
            m.id === assistantId ? { ...m, text: accumulatedText } : m,
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
              ...(currentSpec.state ? { state: { ...currentSpec.state } } : {}),
            }
          : null,
      };
      onCompleteRef.value?.(finalMessage);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return;
      }
      const resolvedError = err instanceof Error ? err : new Error(String(err));
      error.value = resolvedError;
      // Remove empty assistant message on error
      messages.value = messages.value.filter(
        (m) => m.id !== assistantId || m.text.length > 0,
      );
      onErrorRef.value?.(resolvedError);
    } finally {
      isStreaming.value = false;
    }
  };

  // Cleanup on unmount
  onUnmounted(() => {
    abortController?.abort();
  });

  return {
    messages,
    isStreaming,
    error,
    send,
    clear,
  };
}
