"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Catalog, Spec, StateStore } from "@json-render/core";
import {
  markDevtoolsActive,
  registerActionObserver,
  subscribeDevtoolsActive,
} from "@json-render/core";
import { useStateStore } from "@json-render/react";
import {
  actionsTab,
  catalogTab,
  createEventStore,
  createPanel,
  createSelectionBus,
  extractSpecFromParts,
  highlightElement,
  isProduction,
  scanMessageParts,
  specTab,
  startPicker,
  stateTab,
  streamTab,
  type DevtoolsEvent,
  type EventStore,
  type PanelContext,
  type PanelHandle,
  type PanelPosition,
  type SpecEntry,
} from "@json-render/devtools";

/**
 * Minimal shape of an AI SDK `UIMessage` used to capture stream events.
 * We only read the `parts` array, so any ai-sdk version works.
 */
interface ChatLikeMessage {
  id?: string;
  role?: string;
  parts?: Array<{ type: string; text?: string; data?: unknown }>;
}

/**
 * Walk the AI SDK message list and reconstruct the spec for every
 * assistant message that produced one. The resulting list powers the
 * Spec tab's generation switcher — when a chat has multiple assistant
 * turns, the user can pick any of them to inspect, not just the most
 * recent. Falls back to a single entry when only an explicit `spec`
 * prop is present and no messages were passed.
 */
function buildGenerationsList(
  messages: readonly ChatLikeMessage[] | undefined,
  latestSpec: Spec | null,
): SpecEntry[] {
  const out: SpecEntry[] = [];
  if (messages) {
    let idx = 0;
    for (const msg of messages) {
      const spec = extractSpecFromParts(msg?.parts);
      if (!spec || Object.keys(spec.elements).length === 0) continue;
      idx += 1;
      out.push({
        id: msg?.id ?? `gen-${idx}`,
        label: `Generation ${idx}`,
        spec,
      });
    }
  }
  if (out.length === 0 && latestSpec) {
    out.push({ id: "spec", label: "Current spec", spec: latestSpec });
  }
  return out;
}

/**
 * Props for `<JsonRenderDevtools />`.
 */
export interface JsonRenderDevtoolsProps {
  /** The spec currently being rendered. Required for Spec, Pick. */
  spec?: Spec | null;
  /** Catalog for the Catalog panel. Optional. */
  catalog?: Catalog | null;
  /**
   * AI SDK `useChat` messages array. When passed, spec data parts are
   * scanned and streamed into the Stream panel automatically.
   */
  messages?: readonly ChatLikeMessage[];
  /** Start the panel open. Default: `false`. */
  initialOpen?: boolean;
  /**
   * Where the panel docks and where the floating toggle lives.
   * - `"bottom-right"` (default) — bottom-docked panel, toggle bottom-right.
   * - `"bottom-left"` — bottom-docked panel, toggle bottom-left.
   * - `"right"` — right-docked panel (full height), toggle top-right.
   *   Best for app-shell layouts that already use `100vh` or fixed bottom
   *   elements.
   */
  position?: PanelPosition;
  /** Hotkey to toggle, or `false` to disable. Default: `mod+shift+j`. */
  hotkey?: string | false;
  /** Max events retained in the ring buffer. Default: 500. */
  bufferSize?: number;
  /**
   * Whether to reserve space for the panel by applying body padding while
   * open. Default `true`. Set to `false` to keep the panel as a pure
   * overlay; the `--jr-devtools-offset-bottom` / `--jr-devtools-offset-right`
   * CSS custom properties are still published for apps to consume manually.
   */
  reserveSpace?: boolean;
  /**
   * Whether to show a toolbar button that lets the user flip the panel
   * between bottom-dock and right-dock. Default `true`. The user's choice
   * persists to `localStorage` and overrides `position` on subsequent
   * mounts. Pass `false` to lock the dock to whatever `position` specifies.
   */
  allowDockToggle?: boolean;
  /**
   * Optional tap: called for every devtools event. Useful if you want to
   * forward events to your own analytics pipeline.
   */
  onEvent?: (evt: DevtoolsEvent) => void;
}

/** Controls returned from {@link useJsonRenderDevtools}. */
export interface JsonRenderDevtoolsHandle {
  /** Open the panel. */
  open: () => void;
  /** Close the panel. */
  close: () => void;
  /** Toggle open/closed. */
  toggle: () => void;
  /** Emit a custom event into the log. */
  recordEvent: (evt: DevtoolsEvent) => void;
  /** Clear all events. */
  clear: () => void;
}

let globalHandle: JsonRenderDevtoolsHandle | null = null;

/**
 * Access the running devtools from outside the React tree, if mounted.
 * Returns `null` in production or when no `<JsonRenderDevtools />` is live.
 */
export function useJsonRenderDevtools(): JsonRenderDevtoolsHandle | null {
  return globalHandle;
}

/**
 * Drop this component anywhere inside a `<JSONUIProvider>` (or renderer
 * that sets up state/actions contexts) to get a floating devtools panel.
 *
 * In production builds this renders `null`.
 */
export function JsonRenderDevtools(props: JsonRenderDevtoolsProps) {
  if (isProduction()) return null;

  // Stable refs to avoid re-mounting the panel on every render.
  const specRef = useRef<Spec | null>(props.spec ?? null);
  specRef.current = props.spec ?? null;
  const catalogRef = useRef<Catalog | null>(props.catalog ?? null);
  catalogRef.current = props.catalog ?? null;
  // Latest messages live in a ref so the `getSpecs` closure captured by
  // the panel can read them without re-mounting when the messages change.
  const messagesRef = useRef<readonly ChatLikeMessage[] | undefined>(
    props.messages,
  );
  messagesRef.current = props.messages;

  // Read the live StateStore from the json-render state context. Must be
  // rendered inside `<JSONUIProvider>` — useStateStore throws otherwise.
  const ctx = useStateStore();
  const storeRef = useRef<StateStore | null>(null);
  storeRef.current = {
    get: ctx.get,
    set: ctx.set,
    update: ctx.update,
    getSnapshot: ctx.getSnapshot,
    // The context doesn't expose subscribe directly; the State tab
    // re-reads getSnapshot() on each panel refresh. A no-op here keeps
    // the StateStore shape satisfied for downstream consumers.
    subscribe: () => () => {},
  };

  const events = useMemo<EventStore>(
    () => createEventStore({ bufferSize: props.bufferSize }),
    // bufferSize changes would require a re-created buffer; acceptable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.bufferSize],
  );

  // Optional external tap.
  useEffect(() => {
    if (!props.onEvent) return;
    return events.subscribe(() => {
      const snap = events.snapshot();
      const last = snap[snap.length - 1];
      if (last) props.onEvent?.(last);
    });
  }, [events, props.onEvent]);

  // Forward action dispatches to the panel event store.
  useEffect(() => {
    return registerActionObserver({
      onDispatch(evt) {
        events.push({
          kind: "action-dispatched",
          at: evt.at,
          id: evt.id,
          name: evt.name,
          params: evt.params,
        });
      },
      onSettle(evt) {
        events.push({
          kind: "action-settled",
          at: evt.at,
          id: evt.id,
          ok: evt.ok,
          durationMs: evt.durationMs,
          result: evt.result,
          error: evt.error !== undefined ? String(evt.error) : undefined,
        });
      },
    });
  }, [events]);

  // React already re-renders this component when ctx changes (via its
  // subscription to the state store), so we call panel.refresh on every
  // render. It's cheap — rendered tabs only diff their active view.
  useEffect(() => {
    handleRef.current?.refresh();
  });

  // Tap AI SDK message parts for stream events.
  const seenParts = useRef<WeakSet<object>>(new WeakSet());
  useEffect(() => {
    if (!props.messages) return;
    for (const msg of props.messages) {
      if (msg?.parts) scanMessageParts(msg.parts, events, seenParts.current);
    }
  }, [props.messages, events]);

  // Mount the panel once.
  const handleRef = useRef<PanelHandle | null>(null);
  useEffect(() => {
    if (handleRef.current) return;

    const selection = createSelectionBus();
    const ctx: PanelContext = {
      events,
      getSpec: () => specRef.current,
      getSpecs: () =>
        buildGenerationsList(messagesRef.current, specRef.current),
      getCatalog: () => catalogRef.current,
      getStateStore: () => storeRef.current,
      startPicker: (opts) => startPicker(opts),
      selection,
      // Populated by createPanel.
      activateTab: () => {},
    };

    const panel = createPanel({
      context: ctx,
      tabs: [specTab(), stateTab(), actionsTab(), streamTab(), catalogTab()],
      initialOpen: props.initialOpen,
      position: props.position,
      hotkey: props.hotkey,
      reserveSpace: props.reserveSpace,
      allowDockToggle: props.allowDockToggle,
    });

    handleRef.current = panel;

    // Highlight in the host DOM as the selection changes.
    const unsubSelection = selection.subscribe((key: unknown) => {
      if (key) highlightElement(key);
    });

    globalHandle = {
      open: () => panel.open(),
      close: () => panel.close(),
      toggle: () => panel.toggle(),
      recordEvent: (evt) => events.push(evt),
      clear: () => events.clear(),
    };

    const releaseActive = markDevtoolsActive();

    return () => {
      unsubSelection();
      releaseActive();
      panel.destroy();
      handleRef.current = null;
      globalHandle = null;
    };
  }, [
    events,
    props.initialOpen,
    props.position,
    props.hotkey,
    props.reserveSpace,
    props.allowDockToggle,
  ]);

  return null;
}

// Re-export core devtools types for convenience.
export type { DevtoolsEvent } from "@json-render/devtools";

// Keep a silent reference to `subscribeDevtoolsActive` so bundlers don't
// drop it; adapters rely on the core module-level state being loaded.
void subscribeDevtoolsActive;
