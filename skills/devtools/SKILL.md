---
name: devtools
description: Drop-in inspector panel for any json-render app. Use when the user wants to debug a generative UI, inspect the spec tree, edit state at runtime, see dispatched actions, follow stream patches live, browse a catalog, or pick DOM elements to find their spec keys. Triggers include "add devtools", "debug json-render", "inspect the spec", "why is this element not rendering", "see the state at runtime", or requests to tap streams / capture action logs for `@json-render/devtools`.
---

# @json-render/devtools

A floating inspector panel for json-render apps. Framework-agnostic core + per-framework adapters (React, Vue, Svelte, Solid).

Production-safe: the component renders no devtools UI when `process.env.NODE_ENV === "production"`, including when a bundler replaces the expression in a browser without a `process` global. Unbundled environments without `process.env` retain development behavior.

## Install

Install the core package plus the adapter that matches the host app's renderer.

```bash
# React
npm install @json-render/devtools @json-render/devtools-react

# Vue
npm install @json-render/devtools @json-render/devtools-vue

# Svelte
npm install @json-render/devtools @json-render/devtools-svelte

# Solid
npm install @json-render/devtools @json-render/devtools-solid
```

## Drop-in usage

Place `<JsonRenderDevtools />` anywhere inside the existing `<JSONUIProvider>` (or framework equivalent). No other wiring required.

### React

```tsx
import { JsonRenderDevtools } from "@json-render/devtools-react";

<JSONUIProvider registry={registry} handlers={handlers}>
  <Renderer spec={spec} registry={registry} />
  <JsonRenderDevtools spec={spec} catalog={catalog} messages={messages} />
</JSONUIProvider>;
```

### Vue

```vue
<script setup>
import { JsonRenderDevtools } from "@json-render/devtools-vue";
</script>

<template>
  <JSONUIProvider :registry="registry">
    <Renderer :spec="spec" :registry="registry" />
    <JsonRenderDevtools :spec="spec" :catalog="catalog" :messages="messages" />
  </JSONUIProvider>
</template>
```

### Svelte

```svelte
<script>
  import { JsonRenderDevtools } from "@json-render/devtools-svelte";
</script>

<JSONUIProvider {registry}>
  <Renderer {spec} {registry} />
  <JsonRenderDevtools {spec} {catalog} {messages} />
</JSONUIProvider>
```

### Solid

```tsx
import { JsonRenderDevtools } from "@json-render/devtools-solid";

<JSONUIProvider registry={registry}>
  <Renderer spec={spec()} registry={registry} />
  <JsonRenderDevtools
    spec={spec()}
    catalog={catalog}
    messages={messages()}
  />
</JSONUIProvider>;
```

## Controls

- Floating toggle appears bottom-right.
- Hotkey: `Ctrl`/`Cmd` + `Shift` + `J` (configurable via `hotkey` prop).
- Drawer is resizable; height persists to localStorage.

## Props

- `spec` (`Spec | null`) — current spec.
- `catalog` (`Catalog | null`) — catalog definition; required for the Catalog panel.
- `messages` (`UIMessage[]`) — AI SDK `useChat` messages; scanned for spec data parts.
- `initialOpen` (`boolean`) — start open.
- `position` (`"bottom-right" | "bottom-left" | "right"`) — dock + toggle corner. `"bottom-*"` docks at the bottom; `"right"` docks at the right edge full-height (recommended for app-shells that already use `100vh` or fixed bottom bars).
- `hotkey` (`string | false`) — `"mod+shift+j"` by default.
- `bufferSize` (`number`) — event ring-buffer cap, default 500.
- `reserveSpace` (`boolean`, default `true`) — when true the panel pushes the host app by applying `padding-bottom` / `padding-right` on `body`. Set to `false` to keep the panel as a pure overlay.
- `allowDockToggle` (`boolean`, default `true`) — show a toolbar button so the user can flip the panel between bottom-dock and right-dock. User choice persists to `localStorage` and overrides `position` on subsequent mounts. Pass `false` to lock the dock to `position`.
- `onEvent` (`(DevtoolsEvent) => void`) — optional tap.

## Panels

- **Spec** — element tree rooted at `spec.root`; props/visibility/events/watchers detail; integrated `validateSpec` warnings.
- **State** — every JSON Pointer path with inline edit via `store.set`.
- **Actions** — dispatched actions timeline (name, params, result/error, duration).
- **Stream** — spec patches, text chunks, token usage, lifecycle markers grouped by generation.
- **Catalog** — components + actions declared in the catalog with prop chips.

## Picker (toolbar)

The element picker is a toolbar button in the panel header (Chrome-DevTools-style), not a tab. Click it to activate pick mode, then click any rendered element in the page — selection jumps to the Spec tab with that element focused. `Esc` cancels.

## Reserved space & docking

The panel can dock at the bottom or the right edge, and by default the user can flip between the two with a toolbar button (the choice persists to `localStorage`). Set `allowDockToggle={false}` if the host app only works with one dock — the button is hidden and the dock is locked to `position`.

Pick an initial dock that fits your layout:

- **Bottom dock (default)** — works best for docs / marketing / content-flow sites and for app shells built with a `height: 100%` chain (`html { height: 100% }` → `body { height: 100% }` → `.app { height: 100% }`). The panel writes its height to `--jr-devtools-offset-bottom` and applies matching `padding-bottom` to `body`, so non-fixed content naturally makes room.
- **Right dock** (`position="right"`) — recommended for app-shell layouts that use `100vh` or `position: fixed; bottom: 0`. Right docking sidesteps the bottom edge entirely and writes its width to `--jr-devtools-offset-right` instead.

Apps that use `100vh`, `position: fixed`, or `position: sticky` can opt specific elements in with the published CSS custom properties:

```css
.composer   { bottom: var(--jr-devtools-offset-bottom, 0); }
.sidebar    { right:  var(--jr-devtools-offset-right,  0); }
.app-shell  { height: calc(100vh - var(--jr-devtools-offset-bottom, 0)); }
```

If the automatic body padding causes problems with a particular layout, pass `reserveSpace={false}` to make the panel a pure overlay — the CSS custom properties are still published so you can reserve space manually.

(`--jr-devtools-offset` is kept as a back-compat alias for whichever edge is currently active.)

## Multiple renderers on one page (e.g. a chat)

A single `<JsonRenderDevtools />` can inspect many `<Renderer />` instances at once — a chat where each assistant message renders its own spec, a dashboard made of several independent widgets, etc. The recipe:

1. **One top-level `<JSONUIProvider>`** so every renderer shares one state store and one action dispatcher. Devtools lives inside this provider and sees everything through it.
2. **Per-renderer specs, shared state** — each assistant message renders `<Renderer spec={msgSpec} registry={registry} />` directly, not wrapped in its own `StateProvider`. State paths from different messages must not collide.
3. **Namespace state per turn** — when the source is an AI stream, hand the agent a unique `messageId` and require every element key (`<id>-root`) and state path (`/<id>/count`) to be prefixed with it.
4. **Pass `spec={latest}` + `messages={all}`** — `spec` drives the Spec panel (usually the newest assistant message's spec), while `messages` feeds the Stream panel with patches from every turn.
5. **Actions and the picker are already global** — `registerActionObserver` captures dispatches from any `ActionProvider` in the tree, and `data-jr-key` is written by the renderer itself, so Pick works across every rendered element regardless of which message produced it.

See `examples/devtools` for a full AI chat wired this way.

## Imperative API (React only)

```tsx
import { useJsonRenderDevtools } from "@json-render/devtools-react";

const devtools = useJsonRenderDevtools();
devtools?.open();
devtools?.toggle();
devtools?.recordEvent({ kind: "stream-text", at: Date.now(), text: "hi" });
```

Returns `null` in production or before the component mounts.

## Server-side stream tap

Capture spec patches at the API route so events persist server-side or flow into your own telemetry.

```ts
import { tapJsonRenderStream, createEventStore } from "@json-render/devtools";
import { pipeJsonRender } from "@json-render/core";

const events = createEventStore({ bufferSize: 1000 });
const tapped = tapJsonRenderStream(result.toUIMessageStream(), events);
writer.merge(pipeJsonRender(tapped));
```

YAML equivalent: `tapYamlStream`.

## Under the hood

- **Shadow-DOM isolated panel** — the panel's styles never leak into the host app and vice versa.
- **Ring-buffered event store** — capped log of devtools events (state changes, action dispatches, stream patches, etc.).
- **Action observer registry** — each framework's `ActionProvider` reports via `notifyActionDispatch` / `notifyActionSettle` in `@json-render/core`; devtools subscribes via `registerActionObserver`.
- **Picker element tagging** — while devtools is mounted, `ElementRenderer` wraps each rendered element in `<span data-jr-key="..." style="display:contents">` so the picker can map DOM → spec key. No layout impact.
