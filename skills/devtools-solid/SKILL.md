---
name: devtools-solid
description: SolidJS adapter for the json-render devtools inspector. Use whenever the user wants to add, configure, or troubleshoot @json-render/devtools-solid in a SolidJS json-render app, including spec inspection, state editing, action and stream timelines, catalog browsing, or DOM picking.
---

# @json-render/devtools-solid

SolidJS adapter for the json-render devtools panel. Read `skills/devtools/SKILL.md` for the shared panel capabilities, props, docking behavior, and server-side stream taps.

## Install

```bash
npm install @json-render/devtools @json-render/devtools-solid
```

## Mount the panel

Mount `JsonRenderDevtools` inside the existing SolidJS json-render provider:

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

The component renders nothing in production builds. The panel provides the shared devtools controls, including the `Ctrl`/`Cmd` + `Shift` + `J` shortcut. Keep server-side stream instrumentation in `@json-render/devtools`.
