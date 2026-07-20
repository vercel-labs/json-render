import { DestroyRef, inject, signal, type Signal } from "@angular/core";
import { applySpecPatch, createMixedStreamParser } from "@json-render/core";
import type { Spec } from "@json-render/core";

/** A single chat message, which may carry text, a rendered spec, or both. */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  spec: Spec | null;
}

/** Options for {@link injectChatUI}. */
export interface UseChatUIOptions {
  /** API endpoint accepting `{ messages: [{ role, content }] }`, returning a text stream. */
  api: string;
  onComplete?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
}

/** Reactive result of {@link injectChatUI}. */
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

function cloneSpec(spec: Spec): Spec {
  return {
    root: spec.root,
    elements: { ...spec.elements },
    ...(spec.state ? { state: { ...spec.state } } : {}),
  };
}

/**
 * Chat + generative-UI hook. The Angular equivalent of the baseline renderers'
 * `useChatUI`. Manages a multi-turn conversation where each assistant message
 * can carry both text and a spec, separating text lines from JSONL patch lines
 * via core's `createMixedStreamParser`. Call in an injection context.
 */
export function injectChatUI(options: UseChatUIOptions): UseChatUIReturn {
  const { api, onComplete, onError } = options;

  const messages = signal<ChatMessage[]>([]);
  const isStreaming = signal(false);
  const error = signal<Error | null>(null);
  let abortController: AbortController | null = null;

  inject(DestroyRef).onDestroy(() => abortController?.abort());

  const clear = (): void => {
    messages.set([]);
    error.set(null);
  };

  const patchAssistant = (id: string, patch: Partial<ChatMessage>): void => {
    messages.update((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );
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

    const history = [
      ...messages().map((m) => ({ role: m.role, content: m.text })),
      { role: "user" as const, content: text.trim() },
    ];

    messages.update((prev) => [...prev, userMessage, assistantMessage]);
    isStreaming.set(true);
    error.set(null);

    let accumulatedText = "";
    let currentSpec: Spec = { root: "", elements: {} };
    let hasSpec = false;

    try {
      const response = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
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
      const parser = createMixedStreamParser({
        onPatch(patch) {
          hasSpec = true;
          applySpecPatch(currentSpec, patch);
          patchAssistant(assistantId, { spec: cloneSpec(currentSpec) });
        },
        onText(line) {
          accumulatedText += (accumulatedText ? "\n" : "") + line;
          patchAssistant(assistantId, { text: accumulatedText });
        },
      });

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.push(decoder.decode(value, { stream: true }));
      }
      parser.flush();

      onComplete?.({
        id: assistantId,
        role: "assistant",
        text: accumulatedText,
        spec: hasSpec ? cloneSpec(currentSpec) : null,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return;
      }
      const resolved = err instanceof Error ? err : new Error(String(err));
      error.set(resolved);
      messages.update((prev) =>
        prev.filter((m) => m.id !== assistantId || m.text.length > 0),
      );
      onError?.(resolved);
    } finally {
      isStreaming.set(false);
    }
  };

  return {
    messages: messages.asReadonly(),
    isStreaming: isStreaming.asReadonly(),
    error: error.asReadonly(),
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
    // ignore parse failures
  }
  return message;
}
