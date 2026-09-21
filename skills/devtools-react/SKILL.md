---
name: devtools-react
description: React adapter for the json-render devtools inspector. Use whenever the user wants to add, configure, or troubleshoot @json-render/devtools-react in a React json-render app, including spec inspection, state editing, action and stream timelines, catalog browsing, or DOM picking.
---

# @json-render/devtools-react

React adapter for the json-render devtools panel. Read `skills/devtools/SKILL.md` for the shared panel capabilities, props, docking behavior, and server-side stream taps.

## Install

```bash
npm install @json-render/devtools @json-render/devtools-react
```

## Mount the panel

Mount `JsonRenderDevtools` inside the existing React json-render provider so it can observe the renderer's state, actions, and streams:

```tsx
import { JsonRenderDevtools } from "@json-render/devtools-react";

<JSONUIProvider registry={registry} handlers={handlers}>
  <Renderer spec={spec} registry={registry} />
  <JsonRenderDevtools spec={spec} catalog={catalog} messages={messages} />
</JSONUIProvider>;
```

The component renders nothing in production builds. The panel provides the shared devtools controls, including the `Ctrl`/`Cmd` + `Shift` + `J` shortcut.

## Imperative controls

Use `useJsonRenderDevtools` from any mounted React descendant:

```tsx
import { useJsonRenderDevtools } from "@json-render/devtools-react";

const devtools = useJsonRenderDevtools();
devtools?.open();
devtools?.toggle();
devtools?.recordEvent({ kind: "stream-text", at: Date.now(), text: "hi" });
```

The hook returns `null` in production or before the component has mounted. Keep server-side stream instrumentation in `@json-render/devtools`.
