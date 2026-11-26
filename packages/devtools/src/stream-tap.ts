import {
  SPEC_DATA_PART_TYPE,
  applySpecPatch,
  nestedToFlat,
  type Spec,
  type SpecDataPart,
  type StreamChunk,
} from "@json-render/core";
import type { EventStore } from "./event-store";
import type { DevtoolsEvent, TokenUsage } from "./types";

/**
 * A minimal shape compatible with AI SDK `UIMessage.parts[i]`. Defined
 * locally so the devtools package has no dependency on the `ai` package.
 */
interface DataPart {
  type: string;
  text?: string;
  data?: unknown;
  state?: string;
}

/**
 * Wrap a `ReadableStream<StreamChunk>` (e.g. the output of `pipeJsonRender`
 * or any `TransformStream<StreamChunk, StreamChunk>`) so spec patches are
 * mirrored into a devtools `EventStore` as they fly past.
 *
 * Returns the original stream unchanged — the tap just forks a copy.
 *
 * @example
 * ```ts
 * writer.merge(
 *   tapJsonRenderStream(
 *     pipeJsonRender(result.toUIMessageStream()),
 *     devtoolsEventStore,
 *   ),
 * );
 * ```
 */
export function tapJsonRenderStream(
  stream: ReadableStream<StreamChunk>,
  events: EventStore,
): ReadableStream<StreamChunk> {
  const [a, b] = stream.tee();
  void consumeToEvents(b, events, "json");
  return a;
}

/** YAML variant — identical behaviour with `source: "yaml"`. */
export function tapYamlStream(
  stream: ReadableStream<StreamChunk>,
  events: EventStore,
): ReadableStream<StreamChunk> {
  const [a, b] = stream.tee();
  void consumeToEvents(b, events, "yaml");
  return a;
}

async function consumeToEvents(
  stream: ReadableStream<StreamChunk>,
  events: EventStore,
  source: "json" | "yaml",
): Promise<void> {
  events.push({ kind: "stream-lifecycle", at: Date.now(), phase: "start" });
  let ok = true;
  try {
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      forwardChunk(value, events, source);
    }
  } catch (err) {
    ok = false;
    events.push({
      kind: "stream-text",
      at: Date.now(),
      text: `[stream error: ${String(err)}]`,
    });
  } finally {
    events.push({
      kind: "stream-lifecycle",
      at: Date.now(),
      phase: "end",
      ok,
    });
  }
}

function forwardChunk(
  chunk: StreamChunk,
  events: EventStore,
  source: "json" | "yaml",
) {
  if (chunk.type === SPEC_DATA_PART_TYPE) {
    const data = (chunk as { data?: SpecDataPart }).data;
    if (!data) return;
    if (data.type === "patch") {
      events.push({
        kind: "stream-patch",
        at: Date.now(),
        patch: data.patch,
        source,
      });
    }
    return;
  }
  if (chunk.type === "text-delta") {
    const delta = (chunk as { delta?: string }).delta ?? "";
    if (delta) {
      events.push({ kind: "stream-text", at: Date.now(), text: delta });
    }
  }
}

/**
 * Client-side helper: scan a message's `parts` array for spec data parts
 * and push matching events into the store. Use this when rendering chat
 * UIs that use `@ai-sdk/react` `useChat` and pass in `messages`.
 *
 * Idempotent via `seenIds`: only parts not already recorded will emit.
 * Returns the new `seenIds` set so callers can persist it between calls.
 */
export function scanMessageParts(
  parts: readonly DataPart[] | undefined,
  events: EventStore,
  seen: WeakSet<object>,
): void {
  if (!parts) return;
  for (const part of parts) {
    if (!part || typeof part !== "object") continue;
    if (seen.has(part)) continue;
    seen.add(part);
    if (part.type === SPEC_DATA_PART_TYPE) {
      const data = part.data as SpecDataPart | undefined;
      if (!data) continue;
      if (data.type === "patch") {
        events.push({
          kind: "stream-patch",
          at: Date.now(),
          patch: data.patch,
          source: "json",
        });
      }
    }
  }
}

/**
 * Emit a token-usage event. Called by adapters with whatever usage
 * object their framework surfaces (AI SDK `result.usage`).
 */
export function recordUsage(events: EventStore, usage: TokenUsage): void {
  events.push({ kind: "stream-usage", at: Date.now(), usage });
}

/** Deep-copies JSON part data, reading through framework proxies, so replaying parts never mutates them. */
function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Type guard that validates a data part payload looks like a valid
 * {@link SpecDataPart} before we cast it. Malformed payloads are skipped.
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
 * Replay every `SPEC_DATA_PART` in `parts` and return the resulting spec,
 * or `null` if the message has no UI. Mirrors the framework-side
 * `buildSpecFromParts` helper but without a framework dependency — used by
 * the devtools panel's generation switcher to reconstruct each prior
 * assistant message's spec so the user can inspect any of them.
 */
export function extractSpecFromParts(
  parts: readonly DataPart[] | undefined,
): Spec | null {
  if (!parts) return null;
  const spec: Spec = { root: "", elements: {} };
  let hasSpec = false;
  for (const part of parts) {
    if (!part || typeof part !== "object") continue;
    if (part.type !== SPEC_DATA_PART_TYPE) continue;
    const data = part.data;
    if (!isSpecDataPart(data)) continue;
    if (data.type === "patch") {
      hasSpec = true;
      applySpecPatch(spec, cloneJson(data.patch));
    } else if (data.type === "flat") {
      hasSpec = true;
      Object.assign(spec, cloneJson(data.spec));
    } else if (data.type === "nested") {
      hasSpec = true;
      Object.assign(spec, nestedToFlat(cloneJson(data.spec)));
    }
  }
  return hasSpec ? spec : null;
}

/** Emit a pre-built devtools event. Useful for manual instrumentation. */
export function recordEvent(events: EventStore, event: DevtoolsEvent): void {
  events.push(event);
}
