import { createEffect, onCleanup, onMount } from "solid-js";
import type { Catalog, Spec, StateStore } from "@json-render/core";
import { markDevtoolsActive, registerActionObserver } from "@json-render/core";
import { useStateStore } from "@json-render/solid";
import {
  actionsTab,
  catalogTab,
  createEventStore,
  createPanel,
  createSelectionBus,
  highlightElement,
  isProduction,
  scanMessageParts,
  specTab,
  startPicker,
  stateTab,
  streamTab,
  type DevtoolsEvent,
  type PanelHandle,
  type PanelPosition,
} from "@json-render/devtools";

interface ChatLikeMessage {
  parts?: Array<{ type: string; text?: string; data?: unknown }>;
}

/**
 * Props for `<JsonRenderDevtools />`.
 */
export interface JsonRenderDevtoolsProps {
  spec?: Spec | null;
  catalog?: Catalog | null;
  messages?: ChatLikeMessage[];
  initialOpen?: boolean;
  /**
   * Where the panel docks and where the floating toggle lives.
   * - `"bottom-right"` (default), `"bottom-left"` — bottom-docked drawer.
   * - `"right"` — right-docked panel spanning full height; best for
   *   app-shell layouts that already use `100vh` / fixed bottom elements.
   */
  position?: PanelPosition;
  hotkey?: string | false;
  bufferSize?: number;
  /**
   * Reserve space for the panel via body padding while open. Default `true`.
   * Set `false` to keep the panel as a pure overlay; the
   * `--jr-devtools-offset-bottom` / `--jr-devtools-offset-right` CSS
   * custom properties are still published for apps to consume manually.
   */
  reserveSpace?: boolean;
  /**
   * Show a toolbar button to flip the panel between bottom-dock and
   * right-dock. Default `true`. The user's choice persists to
   * localStorage. Set `false` to lock the dock to `position`.
   */
  allowDockToggle?: boolean;
  onEvent?: (evt: DevtoolsEvent) => void;
}

/**
 * Drop this component anywhere inside a Solid `<JSONUIProvider>` to get a
 * floating devtools panel. Production builds render nothing.
 */
export function JsonRenderDevtools(props: JsonRenderDevtoolsProps) {
  if (isProduction()) return null;

  const stateCtx = useStateStore();
  const store: StateStore = {
    get: stateCtx.get,
    set: stateCtx.set,
    update: stateCtx.update,
    getSnapshot: stateCtx.getSnapshot,
    subscribe: () => () => {},
  };

  const events = createEventStore({ bufferSize: props.bufferSize });
  const seenParts = new WeakSet<object>();

  if (props.onEvent) {
    const unsub = events.subscribe(() => {
      const snap = events.snapshot();
      const last = snap[snap.length - 1];
      if (last) props.onEvent?.(last);
    });
    onCleanup(unsub);
  }

  const unsubObserver = registerActionObserver({
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
  onCleanup(unsubObserver);

  // Capture stream events from AI SDK messages.
  createEffect(() => {
    const messages = props.messages;
    if (!messages) return;
    for (const msg of messages) {
      if (msg?.parts) scanMessageParts(msg.parts, events, seenParts);
    }
  });

  let handle: PanelHandle | null = null;
  let releaseActive: (() => void) | null = null;
  let unsubSelection: (() => void) | null = null;

  onMount(() => {
    const selection = createSelectionBus();
    handle = createPanel({
      context: {
        events,
        getSpec: () => props.spec ?? null,
        getCatalog: () => props.catalog ?? null,
        getStateStore: () => store,
        startPicker: (opts) => startPicker(opts),
        selection,
        activateTab: () => {},
      },
      tabs: [specTab(), stateTab(), actionsTab(), streamTab(), catalogTab()],
      initialOpen: props.initialOpen,
      position: props.position,
      hotkey: props.hotkey,
      reserveSpace: props.reserveSpace,
      allowDockToggle: props.allowDockToggle,
    });
    unsubSelection = selection.subscribe((key: unknown) => {
      if (key) highlightElement(key);
    });
    releaseActive = markDevtoolsActive();
  });

  onCleanup(() => {
    unsubSelection?.();
    releaseActive?.();
    handle?.destroy();
    handle = null;
  });

  return null;
}

export type { DevtoolsEvent } from "@json-render/devtools";
