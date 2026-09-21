---
name: devtools-svelte
description: Svelte 5 adapter for the json-render devtools inspector. Use whenever the user wants to add, configure, or troubleshoot @json-render/devtools-svelte in a Svelte json-render app, including spec inspection, state editing, action and stream timelines, catalog browsing, or DOM picking.
---

# @json-render/devtools-svelte

Svelte 5 adapter for the json-render devtools panel. Read `skills/devtools/SKILL.md` for the shared panel capabilities, props, docking behavior, and server-side stream taps.

## Install

```bash
npm install @json-render/devtools @json-render/devtools-svelte
```

## Mount the panel

Mount `JsonRenderDevtools` inside the existing Svelte json-render provider:

```svelte
<script>
  import { JsonRenderDevtools } from "@json-render/devtools-svelte";
</script>

<JSONUIProvider {registry}>
  <Renderer {spec} {registry} />
  <JsonRenderDevtools {spec} {catalog} {messages} />
</JSONUIProvider>
```

The component renders nothing in production builds. The panel provides the shared devtools controls, including the `Ctrl`/`Cmd` + `Shift` + `J` shortcut. Keep server-side stream instrumentation in `@json-render/devtools`.
