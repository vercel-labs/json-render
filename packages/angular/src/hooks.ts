import {
  DestroyRef,
  Signal,
  computed,
  inject,
  isSignal,
  signal,
} from "@angular/core";
import type {
  FlatElement,
  JsonPatch,
  Spec,
  SpecDataPart,
  UIElement,
} from "@json-render/core";
import {
  SPEC_DATA_PART_TYPE,
  addByPath,
  applySpecPatch,
  getByPath,
  nestedToFlat,
  removeByPath,
  setByPath,
} from "@json-render/core";
import { useStateStore } from "./providers/state";

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

type ParsedLine =
  | { type: "patch"; patch: JsonPatch }
  | { type: "usage"; usage: TokenUsage }
  | null;

function parseLine(line: string): ParsedLine {
  try {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) return null;
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
    setByPath(
      newSpec.state as Record<string, unknown>,
      path.slice("/state".length),
      value,
    );
    return;
  }
  if (path.startsWith("/elements/")) {
    const pathParts = path.slice("/elements/".length).split("/");
    const elementKey = pathParts[0];
    if (!elementKey) return;
    if (pathParts.length === 1) {
      newSpec.elements[elementKey] = value as UIElement;
      return;
    }
    const element = newSpec.elements[elementKey];
    if (!element) return;
    const propPath = `/${pathParts.slice(1).join("/")}`;
    const nextElement = { ...element };
    setByPath(
      nextElement as unknown as Record<string, unknown>,
      propPath,
      value,
    );
    newSpec.elements[elementKey] = nextElement;
  }
}

function removeSpecValue(newSpec: Spec, path: string): void {
  if (path === "/state") {
    delete newSpec.state;
    return;
  }
  if (path.startsWith("/state/") && newSpec.state) {
    removeByPath(
      newSpec.state as Record<string, unknown>,
      path.slice("/state".length),
    );
    return;
  }
  if (!path.startsWith("/elements/")) return;
  const pathParts = path.slice("/elements/".length).split("/");
  const elementKey = pathParts[0];
  if (!elementKey) return;
  if (pathParts.length === 1) {
    const { [elementKey]: _removed, ...rest } = newSpec.elements;
    newSpec.elements = rest;
    return;
  }
  const element = newSpec.elements[elementKey];
  if (!element) return;
  const propPath = `/${pathParts.slice(1).join("/")}`;
  const nextElement = { ...element };
  removeByPath(nextElement as unknown as Record<string, unknown>, propPath);
  newSpec.elements[elementKey] = nextElement;
}

function getSpecValue(spec: Spec, path: string): unknown {
  if (path === "/root") return spec.root;
  if (path === "/state") return spec.state;
  if (path.startsWith("/state/") && spec.state) {
    return getByPath(
      spec.state as Record<string, unknown>,
      path.slice("/state".length),
    );
  }
  return getByPath(spec as unknown as Record<string, unknown>, path);
}

function applyPatch(spec: Spec, patch: JsonPatch): Spec {
  const nextSpec: Spec = {
    ...spec,
    elements: { ...spec.elements },
    ...(spec.state ? { state: { ...spec.state } } : {}),
  };

  switch (patch.op) {
    case "add":
    case "replace":
      setSpecValue(nextSpec, patch.path, patch.value);
      break;
    case "remove":
      removeSpecValue(nextSpec, patch.path);
      break;
    case "move": {
      if (!patch.from) break;
      const moved = getSpecValue(nextSpec, patch.from);
      removeSpecValue(nextSpec, patch.from);
      setSpecValue(nextSpec, patch.path, moved);
      break;
    }
    case "copy": {
      if (!patch.from) break;
      setSpecValue(nextSpec, patch.path, getSpecValue(nextSpec, patch.from));
      break;
    }
    case "test":
      break;
  }

  return nextSpec;
}

export interface UseUIStreamOptions {
  api: string;
  onComplete?: (spec: Spec) => void;
  onError?: (error: Error) => void;
}

export interface UseUIStreamReturn {
  spec: Signal<Spec | null>;
  isStreaming: Signal<boolean>;
  error: Signal<Error | null>;
  usage: Signal<TokenUsage | null>;
  rawLines: Signal<string[]>;
  send: (prompt: string, context?: Record<string, unknown>) => Promise<void>;
  clear: () => void;
}

export function useUIStream({
  api,
  onComplete,
  onError,
}: UseUIStreamOptions): UseUIStreamReturn {
  const destroyRef = inject(DestroyRef, { optional: true });
  const spec = signal<Spec | null>(null);
  const isStreaming = signal(false);
  const error = signal<Error | null>(null);
  const usage = signal<TokenUsage | null>(null);
  const rawLines = signal<string[]>([]);

  let abortController: AbortController | null = null;

  const clear = (): void => {
    spec.set(null);
    error.set(null);
    usage.set(null);
    rawLines.set([]);
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

    const previousSpec = context?.previousSpec as Spec | undefined;
    let currentSpec: Spec =
      previousSpec && previousSpec.root
        ? {
            ...previousSpec,
            elements: { ...previousSpec.elements },
          }
        : { root: "", elements: {} };
    spec.set(currentSpec);

    try {
      const response = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, context, currentSpec }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
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
          const parsed = parseLine(trimmed);
          if (!parsed) continue;
          if (parsed.type === "usage") {
            usage.set(parsed.usage);
          } else {
            rawLines.update((value) => [...value, trimmed]);
            currentSpec = applyPatch(currentSpec, parsed.patch);
            spec.set({ ...currentSpec });
          }
        }
      }

      if (buffer.trim()) {
        const parsed = parseLine(buffer.trim());
        if (parsed?.type === "usage") {
          usage.set(parsed.usage);
        } else if (parsed?.type === "patch") {
          rawLines.update((value) => [...value, buffer.trim()]);
          currentSpec = applyPatch(currentSpec, parsed.patch);
          spec.set({ ...currentSpec });
        }
      }

      onComplete?.(currentSpec);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const resolved = err instanceof Error ? err : new Error(String(err));
      error.set(resolved);
      onError?.(resolved);
    } finally {
      isStreaming.set(false);
    }
  };

  destroyRef?.onDestroy(() => {
    abortController?.abort();
  });

  return { spec, isStreaming, error, usage, rawLines, send, clear };
}

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
        parent.children ??= [];
        parent.children.push(element.key);
      }
    } else {
      root = element.key;
    }
  }

  return { root, elements: elementMap };
}

export function useBoundProp<T>(
  propValue: T | undefined,
  bindingPath: string | undefined,
): [T | undefined, (value: T) => void] {
  const { set } = useStateStore();
  return [propValue, (value: T) => bindingPath && set(bindingPath, value)];
}

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

export function buildSpecFromParts(parts: DataPart[]): Spec | null {
  const spec: Spec = { root: "", elements: {} };
  let hasSpec = false;

  for (const part of parts) {
    if (part.type !== SPEC_DATA_PART_TYPE || !isSpecDataPart(part.data))
      continue;
    const payload = part.data;
    if (payload.type === "patch") {
      hasSpec = true;
      applySpecPatch(spec, payload.patch);
    } else if (payload.type === "flat") {
      hasSpec = true;
      Object.assign(spec, payload.spec);
    } else if (payload.type === "nested") {
      hasSpec = true;
      Object.assign(spec, nestedToFlat(payload.spec));
    }
  }

  return hasSpec ? spec : null;
}

export function getTextFromParts(parts: DataPart[]): string {
  return parts
    .filter(
      (part): part is DataPart & { text: string } =>
        part.type === "text" && typeof part.text === "string",
    )
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function useJsonRenderMessage(parts: DataPart[] | Signal<DataPart[]>): {
  spec: Signal<Spec | null>;
  text: Signal<string>;
  hasSpec: Signal<boolean>;
} {
  const partsSignal = isSignal(parts) ? parts : signal(parts);
  const spec = computed(() => buildSpecFromParts(partsSignal()));
  const text = computed(() => getTextFromParts(partsSignal()));
  const hasSpec = computed(
    () => spec() !== null && Object.keys(spec()?.elements ?? {}).length > 0,
  );
  return { spec, text, hasSpec };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  spec: Spec | null;
}

export interface UseChatUIOptions {
  api: string;
  onComplete?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
}

export interface UseChatUIReturn {
  messages: Signal<ChatMessage[]>;
  isStreaming: Signal<boolean>;
  error: Signal<Error | null>;
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

export function useChatUI({
  api,
  onComplete,
  onError,
}: UseChatUIOptions): UseChatUIReturn {
  const destroyRef = inject(DestroyRef, { optional: true });
  const messages = signal<ChatMessage[]>([]);
  const isStreaming = signal(false);
  const error = signal<Error | null>(null);

  let abortController: AbortController | null = null;

  const clear = (): void => {
    messages.set([]);
    error.set(null);
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
    const assistantMessage: ChatMessage = {
      id: generateChatId(),
      role: "assistant",
      text: "",
      spec: null,
    };

    isStreaming.set(true);
    error.set(null);

    const history = messages().map((message) => ({
      role: message.role,
      content: message.text,
    }));

    messages.update((value) => [...value, userMessage, assistantMessage]);

    try {
      const response = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let textBuffer = "";
      let currentSpec: Spec = { root: "", elements: {} };

      const updateAssistant = (): void => {
        const hasCurrentSpec =
          currentSpec.root !== "" ||
          Object.keys(currentSpec.elements).length > 0;
        const resolvedSpec = hasCurrentSpec
          ? { ...currentSpec, elements: { ...currentSpec.elements } }
          : null;

        messages.update((value) =>
          value.map((message) => {
            if (message.id !== assistantMessage.id) {
              return message;
            }

            return {
              ...message,
              text: textBuffer.trim(),
              spec: resolvedSpec,
            };
          }),
        );
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith("{")) {
            try {
              const parsed = JSON.parse(trimmed) as SpecDataPart | JsonPatch;
              if ("type" in parsed && parsed.type === "patch") {
                currentSpec = applyPatch(currentSpec, parsed.patch);
              } else if ("type" in parsed && parsed.type === "flat") {
                currentSpec = parsed.spec;
              } else if ("type" in parsed && parsed.type === "nested") {
                currentSpec = nestedToFlat(parsed.spec);
              } else if ("op" in parsed) {
                currentSpec = applyPatch(currentSpec, parsed);
              } else {
                textBuffer += `${trimmed}\n`;
              }
            } catch {
              textBuffer += `${line}\n`;
            }
          } else {
            textBuffer += `${line}\n`;
          }
          updateAssistant();
        }
      }

      if (buffer.trim()) {
        textBuffer += buffer.trim();
        updateAssistant();
      }

      const finalMessage =
        messages().find((message) => message.id === assistantMessage.id) ??
        assistantMessage;
      onComplete?.(finalMessage);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const resolved = err instanceof Error ? err : new Error(String(err));
      error.set(resolved);
      onError?.(resolved);
    } finally {
      isStreaming.set(false);
    }
  };

  destroyRef?.onDestroy(() => {
    abortController?.abort();
  });

  return { messages, isStreaming, error, send, clear };
}
