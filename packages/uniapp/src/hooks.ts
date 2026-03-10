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

// ---------------------------------------------------------------------------
// UniApp-aware HTTP helpers
// ---------------------------------------------------------------------------

/**
 * Detect whether the UniApp runtime is available.
 */
function getUni(): UniInstance | undefined {
  if (typeof uni !== "undefined") return uni;
  return (globalThis as Record<string, unknown>).uni as UniInstance | undefined;
}

/**
 * Make an HTTP POST request that works in both:
 * - H5 / browser environments (uses `fetch` with streaming support)
 * - WeChat / Alipay / Baidu mini programs (uses `uni.request`, no streaming)
 *
 * Returns a reader for streaming (H5 only) or the full text for mini programs.
 */
interface UniRequest {
  mode: "stream";
  reader: ReadableStreamDefaultReader<Uint8Array>;
}
interface UniRequestFull {
  mode: "full";
  body: string;
}
type UniRequestResult = UniRequest | UniRequestFull;

async function uniPost(
  url: string,
  data: unknown,
  signal?: AbortSignal,
): Promise<UniRequestResult> {
  const uniObj = getUni();

  // H5 or environments with fetch + streaming support
  if (typeof fetch !== "undefined" && typeof ReadableStream !== "undefined") {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal,
    });

    if (!response.ok) {
      let errorMessage = `HTTP error: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.message) errorMessage = errorData.message;
        else if (errorData.error) errorMessage = errorData.error;
      } catch {
        // ignore
      }
      throw new Error(errorMessage);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");
    return { mode: "stream", reader };
  }

  // Mini program environment — fall back to uni.request (no streaming)
  if (uniObj?.request) {
    return new Promise((resolve, reject) => {
      uniObj!.request({
        url,
        method: "POST",
        header: { "Content-Type": "application/json" },
        data: JSON.stringify(data),
        success: (res: { statusCode: number; data: unknown }) => {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP error: ${res.statusCode}`));
            return;
          }
          resolve({ mode: "full", body: String(res.data) });
        },
        fail: (err: { errMsg?: string }) => {
          reject(new Error(String(err.errMsg ?? err)));
        },
      });
    });
  }

  throw new Error("No HTTP client available");
}

// ---------------------------------------------------------------------------
// Process a full response body (non-streaming mini program path)
// ---------------------------------------------------------------------------

function processFullBody(body: string, onLine: (line: string) => void): void {
  const lines = body.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) onLine(trimmed);
  }
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
 * Composable for streaming UI generation.
 *
 * On UniApp H5 platform uses streaming (fetch + ReadableStream).
 * On mini program platforms uses `uni.request` (full response, no streaming).
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
    abortController =
      typeof AbortController !== "undefined" ? new AbortController() : null;

    isStreaming.value = true;
    error.value = null;
    usage.value = null;
    rawLines.value = [];

    const previousSpec = context?.previousSpec as Spec | undefined;
    let currentSpec: Spec =
      previousSpec && previousSpec.root
        ? { ...previousSpec, elements: { ...previousSpec.elements } }
        : { root: "", elements: {} };
    spec.value = currentSpec;

    const processLine = (trimmed: string) => {
      const result = parseLine(trimmed);
      if (!result) return;
      if (result.type === "usage") {
        usage.value = result.usage;
      } else {
        rawLines.value = [...rawLines.value, trimmed];
        currentSpec = applyPatch(currentSpec, result.patch);
        spec.value = { ...currentSpec };
      }
    };

    try {
      const result = await uniPost(
        api,
        { prompt, context, currentSpec },
        abortController?.signal,
      );

      if (result.mode === "stream") {
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await result.reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (line.trim()) processLine(line.trim());
          }
        }
        if (buffer.trim()) processLine(buffer.trim());
      } else {
        processFullBody(result.body, processLine);
      }

      onCompleteRef.value?.(currentSpec);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const resolvedError = err instanceof Error ? err : new Error(String(err));
      error.value = resolvedError;
      onErrorRef.value?.(resolvedError);
    } finally {
      isStreaming.value = false;
    }
  };

  onUnmounted(() => {
    abortController?.abort();
  });

  return { spec, isStreaming, error, usage, rawLines, send, clear };
}

/**
 * Convert a flat element list to a Spec.
 */
export function flatToTree(elements: FlatElement[]): Spec {
  const elementMap: Record<string, UIElement> = {};
  let root = "";

  for (const element of elements) {
    elementMap[element.key] = {
      type: element.type,
      props: element.props,
      children: [],
      visible: element.visible,
    };
  }

  for (const element of elements) {
    if (element.parentKey) {
      const parent = elementMap[element.parentKey];
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(element.key);
      }
    } else {
      root = element.key;
    }
  }

  return { root, elements: elementMap };
}

// =============================================================================
// useBoundProp — Two-way binding helper
// =============================================================================

/**
 * Composable for two-way bound props. Returns `[value, setValue]` where:
 * - `value` is the already-resolved prop value
 * - `setValue` writes back to the bound state path (no-op if not bound)
 *
 * @example
 * ```ts
 * const Input: ComponentFn<AppCatalog, "Input"> = ({ props, bindings }) => {
 *   const [value, setValue] = useBoundProp<string>(props.value as string, bindings?.value);
 *   return h('input', { value: value ?? "", onInput: (e) => setValue(e.target.value) });
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
 * A single part from the AI SDK's `message.parts` array.
 */
export interface DataPart {
  type: string;
  text?: string;
  data?: unknown;
}

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
// useJsonRenderMessage
// =============================================================================

/**
 * Composable that extracts both the json-render spec and text content from
 * a message's parts array.
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
 * A single message in the chat
 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  spec: Spec | null;
}

/**
 * Options for useChatUI
 */
export interface UseChatUIOptions {
  api: string;
  onComplete?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
}

/**
 * Return type for useChatUI
 */
export interface UseChatUIReturn {
  messages: Ref<ChatMessage[]>;
  isStreaming: Ref<boolean>;
  error: Ref<Error | null>;
  send: (text: string) => Promise<void>;
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
 * On UniApp H5 uses streaming (fetch + ReadableStream).
 * On mini program platforms uses `uni.request` (full response).
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

    abortController?.abort();
    abortController =
      typeof AbortController !== "undefined" ? new AbortController() : null;

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

    messages.value = [...messages.value, userMessage, assistantMessage];
    isStreaming.value = true;
    error.value = null;

    const historyForApi = [
      ...messages.value
        .filter((m) => m.id !== assistantId)
        .map((m) => ({ role: m.role, content: m.text })),
      { role: "user" as const, content: text.trim() },
    ];

    let accumulatedText = "";
    let currentSpec: Spec = { root: "", elements: {} };
    let hasSpec = false;

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

    try {
      const result = await uniPost(
        api,
        { messages: historyForApi },
        abortController?.signal,
      );

      if (result.mode === "stream") {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await result.reader.read();
          if (done) break;
          parser.push(decoder.decode(value, { stream: true }));
        }
        parser.flush();
      } else {
        // Mini program: process full body line by line
        const lines = result.body.split("\n");
        for (const line of lines) {
          if (line.trim()) parser.push(line + "\n");
        }
        parser.flush();
      }

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
      if ((err as Error).name === "AbortError") return;
      const resolvedError = err instanceof Error ? err : new Error(String(err));
      error.value = resolvedError;
      messages.value = messages.value.filter(
        (m) => m.id !== assistantId || m.text.length > 0,
      );
      onErrorRef.value?.(resolvedError);
    } finally {
      isStreaming.value = false;
    }
  };

  onUnmounted(() => {
    abortController?.abort();
  });

  return { messages, isStreaming, error, send, clear };
}
