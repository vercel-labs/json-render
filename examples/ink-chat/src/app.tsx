import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import { streamText, stepCountIs } from "ai";
import { gateway } from "@ai-sdk/gateway";
import {
  createMixedStreamParser,
  createStateStore,
  applySpecPatch,
  type Spec,
} from "@json-render/core";
import { JSONUIProvider, Renderer, useFocusDisable } from "@json-render/ink";
import { catalog } from "./catalog.js";
import { tools } from "./tools.js";

const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";

// Component types stepped through one-at-a-time in the wizard.
// Tabs are excluded — they're navigation, rendered inline with the full spec.
const WIZARD_TYPES = new Set([
  "TextInput",
  "Select",
  "MultiSelect",
  "ConfirmInput",
]);

// Interactive component types that need live keyboard input (wizard types + Tabs)
const INTERACTIVE_TYPES = new Set([...WIZARD_TYPES, "Tabs"]);

/** Check if a spec contains any interactive components */
function hasInteractiveElements(spec: Spec): boolean {
  return Object.values(spec.elements).some((el) =>
    INTERACTIVE_TYPES.has(el.type),
  );
}

/** Collect an element and all its descendants from the spec tree */
function collectSubtree(spec: Spec, rootKey: string): Spec["elements"] {
  const result: Spec["elements"] = {};
  const queue = [rootKey];
  while (queue.length > 0) {
    const key = queue.shift()!;
    const el = spec.elements[key];
    if (!el) continue;
    result[key] = el;
    if (el.children) queue.push(...el.children);
  }
  return result;
}

/** Get event→action bindings that auto-advance the wizard for each component type */
function getAdvanceEvents(
  type: string,
): Record<string, Array<{ action: string }>> | null {
  switch (type) {
    case "Select":
      return { change: [{ action: "advance" }] };
    case "TextInput":
    case "MultiSelect":
      return { submit: [{ action: "advance" }] };
    case "ConfirmInput":
      return {
        confirm: [{ action: "advance" }],
        deny: [{ action: "advance" }],
      };
    default:
      return null;
  }
}

/** Step-specific hint text */
function getStepHint(type: string, isLast: boolean): string {
  const action = isLast ? "submit" : "continue";
  switch (type) {
    case "Select":
      return `Use arrow keys, Enter to ${action}`;
    case "MultiSelect":
      return `Space to toggle, Enter to ${action}`;
    case "TextInput":
      return `Type your answer, Enter to ${action}`;
    case "ConfirmInput":
      return `Press Y or N to ${action}`;
    default:
      return `Make your selection to ${action}`;
  }
}

// ---------------------------------------------------------------------------
// System prompt — embeds catalog documentation so the AI knows what components
// are available and how to output JSONL patches.
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = catalog.prompt({
  system:
    "You are a terminal chat assistant. Use tools for real-time data (web_search, get_weather, get_hacker_news, get_github_repo, get_crypto_price), then render results as rich terminal UIs.",
  mode: "inline",
  customRules: [
    "ALL text MUST go inside the spec using the Markdown component. NEVER write prose, summaries, or explanations outside the ```spec fence. The ONLY text allowed outside the fence is a single short status like 'Searching…' while tools run.",
    "For text-only answers (greetings, clarifications), still output a ```spec with a Markdown component.",
    "Prefer Table for structured data (forecasts, leaderboards, language breakdowns) and KeyValue for label-value pairs (stats, metadata).",

    // Interactive components
    "INTERACTIVE UIs: You can create interactive forms, surveys, and selection interfaces that the user actually interacts with in the terminal. The user navigates with arrow keys, selects with Space/Enter, and types into text fields.",
    "When creating interactive UIs, ALWAYS include a submit action. Add an element (usually a Text or StatusLine) that tells the user to press Enter or a specific key to submit. Wire up the submit event to a 'submit' action — the app will collect the form state and send it back to you automatically.",
    "For interactive specs, ALWAYS populate the state field with sensible defaults for all bound values. Example: if a Select binds to /framework, include state: { framework: 'react' }.",
    'IMPORTANT: Use $bindState on interactive components so their values are written back to state. Example for Select: { "value": { "$state": "/choice" }, "$bindState": { "value": "/choice" } }.',
    "For surveys/quizzes with multiple sections, use Tabs to organize them. Bind the active tab to state and use visible conditions on children.",
    "For confirmation prompts, use ConfirmInput with a clear message. The confirm/deny events can trigger actions.",
    "After receiving submitted form data, acknowledge the user's choices and respond to them — don't just repeat what they selected.",
  ],
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  spec: Spec | null;
}

// ---------------------------------------------------------------------------
// ChatInput — simple terminal text input
// ---------------------------------------------------------------------------

function ChatInput({
  onSubmit,
  disabled,
}: {
  onSubmit: (text: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");

  useInput(
    (input, key) => {
      if (key.return && value.trim()) {
        onSubmit(value.trim());
        setValue("");
        return;
      }

      if (key.backspace || key.delete) {
        setValue((prev) => prev.slice(0, -1));
        return;
      }

      if (key.ctrl || key.meta || key.escape || key.tab) return;
      if (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow)
        return;

      if (input) {
        setValue((prev) => prev + input);
      }
    },
    { isActive: !disabled },
  );

  return (
    <Box>
      <Text bold>{"› "}</Text>
      {value ? (
        <Text>{value}</Text>
      ) : (
        <Text dimColor>{disabled ? "Thinking..." : "Type a message..."}</Text>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Small UI helpers
// ---------------------------------------------------------------------------

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function AnimatedSpinner({
  label,
  color = "cyan",
}: {
  label: string;
  color?: string;
}) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box gap={1}>
      <Text color={color}>{SPINNER_FRAMES[frame]}</Text>
      <Text dimColor>{label}</Text>
    </Box>
  );
}

/** Suppress Tab-cycling inside read-only message providers so old interactive
 *  components (e.g. Tabs) can't steal focus/arrow-key input. */
function DisableFocus() {
  useFocusDisable(true);
  return null;
}

/** Render markdown text through the standard Renderer pipeline (uses the
 *  built-in Markdown component without exporting MarkdownText). */
function RenderedMarkdown({ text }: { text: string }) {
  const spec: Spec = useMemo(
    () => ({
      root: "md",
      elements: { md: { type: "Markdown", props: { text }, children: [] } },
    }),
    [text],
  );

  return (
    <JSONUIProvider initialState={{}}>
      <DisableFocus />
      <Renderer spec={spec} />
    </JSONUIProvider>
  );
}

function MessageView({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <Box marginBottom={1}>
        <Text bold>You: </Text>
        <Text>{message.text}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold>AI:</Text>
      {message.spec ? (
        <JSONUIProvider initialState={message.spec.state ?? {}}>
          <DisableFocus />
          <Renderer spec={message.spec} />
        </JSONUIProvider>
      ) : message.text ? (
        <RenderedMarkdown text={message.text} />
      ) : null}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// LiveInteractiveSpec — wizard that shows one interactive element at a time
// ---------------------------------------------------------------------------

function LiveInteractiveSpec({
  spec,
  onSubmit,
}: {
  spec: Spec;
  onSubmit: (state: Record<string, unknown>) => void;
}) {
  // Extract wizard-steppable element keys (Tabs are excluded)
  const interactiveKeys = useMemo(
    () =>
      Object.entries(spec.elements)
        .filter(([_, el]) => WIZARD_TYPES.has(el.type))
        .map(([key]) => key),
    [spec],
  );

  const [step, setStep] = useState(0);
  const store = useMemo(() => createStateStore(spec.state ?? {}), [spec]);
  // Guard against double-advance from key repeats (e.g. holding Y on ConfirmInput)
  const advancingRef = useRef(false);

  const currentKey = interactiveKeys[step];
  const currentElement = currentKey ? spec.elements[currentKey] : null;
  const isLast = step >= interactiveKeys.length - 1;

  // Reset the guard when the step changes
  useEffect(() => {
    advancingRef.current = false;
  }, [step]);

  const advance = useCallback(() => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    if (isLast) {
      onSubmit(store.getSnapshot());
    } else {
      setStep((s) => s + 1);
    }
  }, [isLast, onSubmit, store]);

  // Build a minimal spec containing only the current interactive element
  const stepSpec = useMemo<Spec | null>(() => {
    if (!currentKey || !currentElement) return null;

    const elements = collectSubtree(spec, currentKey);

    // Wire auto-advance events
    const advanceEvents = getAdvanceEvents(currentElement.type);
    if (advanceEvents) {
      elements[currentKey] = {
        ...elements[currentKey]!,
        on: { ...(elements[currentKey] as any).on, ...advanceEvents },
      };
    }

    return { root: currentKey, elements, state: spec.state };
  }, [currentKey, currentElement, spec]);

  const handlers = useMemo(() => ({ submit: advance, advance }), [advance]);

  // No wizard-steppable elements (e.g. Tabs-only spec) → render the full spec
  if (interactiveKeys.length === 0) {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="green">
          AI:
        </Text>
        <JSONUIProvider store={store} handlers={handlers}>
          <Renderer spec={spec} />
        </JSONUIProvider>
      </Box>
    );
  }

  if (!stepSpec || !currentElement) return null;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="green">
        AI:
      </Text>
      {interactiveKeys.length > 1 && (
        <Text dimColor>
          Step {step + 1} of {interactiveKeys.length}
        </Text>
      )}
      <JSONUIProvider store={store} handlers={handlers}>
        <Renderer spec={stepSpec} />
      </JSONUIProvider>
      <Box marginTop={1}>
        <Text dimColor italic>
          {getStepHint(currentElement.type, isLast)}
        </Text>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// App — main chat loop
// ---------------------------------------------------------------------------

export function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState("Thinking...");
  const [streamingSpec, setStreamingSpec] = useState<Spec | null>(null);
  const nextMessageIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  // Ref tracks latest messages so sendMessage doesn't need it as a dep
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Track a live interactive spec awaiting user input
  const [liveSpec, setLiveSpec] = useState<Spec | null>(null);

  // Ctrl+C to exit (suppress Escape when interactive spec is live)
  useInput((_input, key) => {
    if (key.ctrl && _input === "c") {
      abortRef.current?.abort();
      exit();
    }
    if (key.escape && !liveSpec) {
      abortRef.current?.abort();
      exit();
    }
  });

  const sendMessage = useCallback(async (text: string) => {
    abortRef.current?.abort();
    // Clear any live interactive spec
    setLiveSpec(null);
    // Add user message
    const userMsg: Message = {
      id: nextMessageIdRef.current++,
      role: "user",
      text,
      spec: null,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingStatus("Thinking...");

    // Build conversation history from ref (avoids stale closure).
    // For assistant messages with specs, serialize the spec so the model
    // remembers what it rendered in previous turns.
    const history = [
      ...messagesRef.current.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.spec
          ? `${m.text}\n\`\`\`spec\n${JSON.stringify(m.spec)}\n\`\`\``
          : m.text,
      })),
      { role: "user" as const, content: text },
    ];

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = streamText({
        model: gateway(process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL),
        system: SYSTEM_PROMPT,
        messages: history,
        temperature: 0.7,
        abortSignal: controller.signal,
        tools,
        stopWhen: stepCountIs(3),
      });

      let conversationText = "";
      let spec: Spec = { root: "", elements: {} };
      let hasSpec = false;

      const parser = createMixedStreamParser({
        onText: (chunk) => {
          conversationText += chunk + "\n";
        },
        onPatch: (patch) => {
          hasSpec = true;
          spec = applySpecPatch(structuredClone(spec), patch);
          setStreamingSpec(structuredClone(spec));
        },
      });

      let hadTextInStep = false;
      for await (const part of result.fullStream) {
        if (part.type === "tool-call") {
          const name = part.toolName.replace(/_/g, " ");
          setStreamingStatus(`Using ${name}...`);
        } else if (part.type === "tool-result") {
          setStreamingStatus("Generating...");
        } else if (part.type === "text-start") {
          hadTextInStep = false;
        } else if (part.type === "text-delta") {
          hadTextInStep = true;
          parser.push(part.text);
        } else if (part.type === "text-end") {
          // Insert a paragraph break between text segments so text from
          // before/after tool calls doesn't merge into a wall.
          // Injected directly into conversationText (not through the
          // parser, which may drop empty lines in older builds).
          if (hadTextInStep) {
            parser.flush();
            conversationText += "\n\n";
            hadTextInStep = false;
          }
        }
      }
      parser.flush();

      // Finalize: add assistant message
      const finalSpec = hasSpec ? spec : null;
      const isInteractive = finalSpec && hasInteractiveElements(finalSpec);

      const assistantMsg: Message = {
        id: nextMessageIdRef.current++,
        role: "assistant",
        text: conversationText.trim(),
        // If interactive, don't store spec in message history (it'll be live)
        spec: isInteractive ? null : finalSpec,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // If the spec has interactive components, keep it live
      if (isInteractive && finalSpec) {
        setLiveSpec(finalSpec);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const errorMsg: Message = {
        id: nextMessageIdRef.current++,
        role: "assistant",
        text: `Error: ${(err as Error).message}`,
        spec: null,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsStreaming(false);
      setStreamingSpec(null);
    }
  }, []);

  // Handle interactive spec submission — collect state and send back to AI
  const handleInteractiveSubmit = useCallback(
    (state: Record<string, unknown>) => {
      // Freeze the spec into message history as a non-interactive snapshot
      if (liveSpec) {
        // Update the last assistant message to include the spec with submitted state
        const frozenSpec = { ...liveSpec, state };
        setMessages((prev) => {
          const updated = [...prev];
          // Find the last assistant message (which has spec: null for interactive)
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i]!.role === "assistant" && !updated[i]!.spec) {
              updated[i] = { ...updated[i]!, spec: frozenSpec };
              break;
            }
          }
          return updated;
        });
        setLiveSpec(null);
      }

      // Format the submitted state as a user message and send to AI
      const formattedState = Object.entries(state)
        .map(([key, value]) => {
          if (Array.isArray(value)) return `${key}: ${value.join(", ")}`;
          return `${key}: ${value}`;
        })
        .join("\n");

      sendMessage(`[Form submitted]\n${formattedState}`);
    },
    [liveSpec, sendMessage],
  );

  return (
    <Box flexDirection="column" padding={1} minHeight={stdout.rows}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>json-render terminal chat</Text>
        <Text dimColor> (Ctrl+C to exit)</Text>
      </Box>

      {/* Message history — collapsed when interactive wizard is active */}
      {liveSpec && !isStreaming ? (
        <>
          {messages.length > 1 && (
            <Text dimColor italic>
              {messages.length - 1} earlier message
              {messages.length > 2 ? "s" : ""} hidden
            </Text>
          )}
          {messages.length > 0 && (
            <MessageView message={messages[messages.length - 1]!} />
          )}
          <LiveInteractiveSpec
            spec={liveSpec}
            onSubmit={handleInteractiveSubmit}
          />
        </>
      ) : (
        <>
          {messages.map((msg) => (
            <MessageView key={msg.id} message={msg} />
          ))}
        </>
      )}

      {/* Live spec preview while streaming */}
      {isStreaming && streamingSpec && streamingSpec.root && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>AI:</Text>
          <JSONUIProvider initialState={streamingSpec.state ?? {}}>
            <DisableFocus />
            <Renderer spec={streamingSpec} />
          </JSONUIProvider>
        </Box>
      )}

      {/* Spacer pushes input to bottom when content is short */}
      <Box flexGrow={1} />

      {/* Input — spinner replaces input while streaming, hidden during wizard */}
      {!liveSpec && (
        <Box borderStyle="single" borderColor="gray" paddingX={1}>
          {isStreaming ? (
            <AnimatedSpinner label={streamingStatus} />
          ) : (
            <ChatInput onSubmit={sendMessage} disabled={false} />
          )}
        </Box>
      )}
    </Box>
  );
}
