import type { Spec, JsonPatch } from "@json-render/core";
import {
  setByPath,
  getByPath,
  removeByPath,
  createMixedStreamParser,
  applySpecPatch,
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
 * UI Stream state
 */
export interface UIStreamState {
  spec: Spec | null;
  isStreaming: boolean;
  error: Error | null;
  usage: TokenUsage | null;
  rawLines: string[];
}

/**
 * UI Stream return type
 */
export interface UIStreamReturn {
  readonly spec: Spec | null;
  readonly isStreaming: boolean;
  readonly error: Error | null;
  readonly usage: TokenUsage | null;
  readonly rawLines: string[];
  send: (prompt: string, context?: Record<string, unknown>) => Promise<void>;
  clear: () => void;
}

/**
 * Options for createUIStream
 */
export interface UIStreamOptions {
  api: string;
  onComplete?: (spec: Spec) => void;
  onError?: (error: Error) => void;
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
    const parsed = JSON.parse(trimmed);

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
      newSpec.elements[elementKey] = value as Spec["elements"][string];
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

function getSpecValue(spec: Spec, path: string): unknown {
  if (path === "/root") return spec.root;
  if (path === "/state") return spec.state;
  if (path.startsWith("/state/") && spec.state) {
    const statePath = path.slice("/state".length);
    return getByPath(spec.state as Record<string, unknown>, statePath);
  }
  return getByPath(spec as unknown as Record<string, unknown>, path);
}

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
      break;
    }
  }

  return newSpec;
}

/**
 * Create a streaming UI generator using Svelte 5 $state
 */
export function createUIStream({
  api,
  onComplete,
  onError,
}: UIStreamOptions): UIStreamReturn {
  let spec = $state<Spec | null>(null);
  let isStreaming = $state(false);
  let error = $state<Error | null>(null);
  let usage = $state<TokenUsage | null>(null);
  let rawLines = $state<string[]>([]);
  let abortController: AbortController | null = null;

  const clear = () => {
    spec = null;
    error = null;
    usage = null;
    rawLines = [];
  };

  const send = async (
    prompt: string,
    context?: Record<string, unknown>,
  ): Promise<void> => {
    abortController?.abort();
    abortController = new AbortController();

    isStreaming = true;
    error = null;
    usage = null;
    rawLines = [];

    const previousSpec = context?.previousSpec as Spec | undefined;
    let currentSpec: Spec =
      previousSpec && previousSpec.root
        ? { ...previousSpec, elements: { ...previousSpec.elements } }
        : { root: "", elements: {} };
    spec = currentSpec;

    try {
      const response = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, context, currentSpec }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        let errorMessage = `HTTP error: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.message) errorMessage = errorData.message;
          else if (errorData.error) errorMessage = errorData.error;
        } catch {
          // Ignore
        }
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const result = parseLine(trimmed);
          if (!result) continue;
          if (result.type === "usage") {
            usage = result.usage;
          } else {
            rawLines = [...rawLines, trimmed];
            currentSpec = applyPatch(currentSpec, result.patch);
            spec = { ...currentSpec };
          }
        }
      }

      if (buffer.trim()) {
        const trimmed = buffer.trim();
        const result = parseLine(trimmed);
        if (result) {
          if (result.type === "usage") {
            usage = result.usage;
          } else {
            rawLines = [...rawLines, trimmed];
            currentSpec = applyPatch(currentSpec, result.patch);
            spec = { ...currentSpec };
          }
        }
      }

      onComplete?.(currentSpec);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const e = err instanceof Error ? err : new Error(String(err));
      error = e;
      onError?.(e);
    } finally {
      isStreaming = false;
    }
  };

  return {
    get spec() {
      return spec;
    },
    get isStreaming() {
      return isStreaming;
    },
    get error() {
      return error;
    },
    get usage() {
      return usage;
    },
    get rawLines() {
      return rawLines;
    },
    send,
    clear,
  };
}

/**
 * Chat message type
 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  spec: Spec | null;
}

/**
 * Chat UI options
 */
export interface ChatUIOptions {
  api: string;
  onComplete?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
}

/**
 * Chat UI return type
 */
export interface ChatUIReturn {
  readonly messages: ChatMessage[];
  readonly isStreaming: boolean;
  readonly error: Error | null;
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
 * Create a chat UI with streaming support
 */
export function createChatUI({
  api,
  onComplete,
  onError,
}: ChatUIOptions): ChatUIReturn {
  let messages = $state<ChatMessage[]>([]);
  let isStreaming = $state(false);
  let error = $state<Error | null>(null);
  let abortController: AbortController | null = null;

  const clear = () => {
    messages = [];
    error = null;
  };

  const send = async (text: string): Promise<void> => {
    if (!text.trim()) return;

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

    messages = [...messages, userMessage, assistantMessage];
    isStreaming = true;
    error = null;

    const historyForApi = messages
      .slice(0, -1)
      .map((m) => ({ role: m.role, content: m.text }));

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
          if (errorData.message) errorMessage = errorData.message;
          else if (errorData.error) errorMessage = errorData.error;
        } catch {
          // Ignore
        }
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();

      const parser = createMixedStreamParser({
        onPatch(patch) {
          hasSpec = true;
          applySpecPatch(currentSpec, patch);
          messages = messages.map((m) =>
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
          messages = messages.map((m) =>
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
      onComplete?.(finalMessage);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const e = err instanceof Error ? err : new Error(String(err));
      error = e;
      messages = messages.filter(
        (m) => m.id !== assistantId || m.text.length > 0,
      );
      onError?.(e);
    } finally {
      isStreaming = false;
    }
  };

  return {
    get messages() {
      return messages;
    },
    get isStreaming() {
      return isStreaming;
    },
    get error() {
      return error;
    },
    send,
    clear,
  };
}
