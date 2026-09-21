---
name: devtools-vue
description: Vue adapter for the json-render devtools inspector. Use whenever the user wants to add, configure, or troubleshoot @json-render/devtools-vue in a Vue json-render app, including spec inspection, state editing, action and stream timelines, catalog browsing, or DOM picking.
---

# @json-render/devtools-vue

Vue adapter for the json-render devtools panel. Read `skills/devtools/SKILL.md` for the shared panel capabilities, props, docking behavior, and server-side stream taps.

## Install

```bash
npm install @json-render/devtools @json-render/devtools-vue
```

## Mount the panel

Mount `JsonRenderDevtools` inside the existing Vue json-render provider:

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

The component renders nothing in production builds. The panel provides the shared devtools controls, including the `Ctrl`/`Cmd` + `Shift` + `J` shortcut. Keep server-side stream instrumentation in `@json-render/devtools`.
