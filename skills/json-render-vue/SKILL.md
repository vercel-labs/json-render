---
name: json-render-vue
description: Vue 3 renderer for json-render. Use when building Vue UIs from JSON specs, working with @json-render/vue, defining Vue component registries, or rendering AI-generated specs in Vue.
---

# @json-render/vue

Vue 3 renderer that converts JSON specs into Vue component trees with data binding, visibility, and actions.

## Installation

```bash
npm install @json-render/vue @json-render/core zod
```

Peer dependencies: `vue ^3.5.0` and `zod ^4.0.0`.

## Quick Start

### Create a Catalog

```typescript
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/vue/schema";
import { z } from "zod";

export const catalog = defineCatalog(schema, {
  components: {
    Card: {
      props: z.object({ title: z.string(), description: z.string().nullable() }),
      description: "A card container",
    },
    Button: {
      props: z.object({ label: z.string(), action: z.string() }),
      description: "A clickable button",
    },
  },
  actions: {},
});
```

### Define Registry with h() Render Functions

```typescript
import { h } from "vue";
import { defineRegistry } from "@json-render/vue";
import { catalog } from "./catalog";

export const { registry } = defineRegistry(catalog, {
  components: {
    Card: ({ props, children }) =>
      h("div", { class: "card" }, [
        h("h3", null, props.title),
        props.description ? h("p", null, props.description) : null,
        children,
      ]),
    Button: ({ props, emit }) =>
      h("button", { onClick: () => emit("press") }, props.label),
  },
});
```

### Render Specs

```vue
<script setup lang="ts">
import { StateProvider, ActionProvider, Renderer } from "@json-render/vue";
import { registry } from "./registry";

const spec = { root: "card-1", elements: { /* ... */ } };
</script>

<template>
  <StateProvider :initial-state="{ form: { name: '' } }">
    <ActionProvider :handlers="{ submit: handleSubmit }">
      <Renderer :spec="spec" :registry="registry" />
    </ActionProvider>
  </StateProvider>
</template>
```

## Providers

| Provider | Purpose |
|----------|---------|
| `StateProvider` | Share state across components (JSON Pointer paths). Accepts `initialState` or `store` for controlled mode. |
| `ActionProvider` | Handle actions dispatched via the event system |
| `VisibilityProvider` | Enable conditional rendering based on state |
| `ValidationProvider` | Form field validation |

## Composables

| Composable | Purpose |
|------------|---------|
| `useStateStore()` | Access state context (`state` as `ShallowRef`, `get`, `set`, `update`) |
| `useStateValue(path)` | Get single value from state |
| `useIsVisible(condition)` | Check if a visibility condition is met |
| `useActions()` | Access action context |
| `useAction(binding)` | Get a single action dispatch function |
| `useFieldValidation(path, config)` | Field validation state |
| `useBoundProp(propValue, bindingPath)` | Two-way binding for `$bindState`/`$bindItem` |

Note: `useStateStore().state` returns a `ShallowRef<StateModel>` — use `state.value` to access.

## External Store (StateStore)

Pass a `StateStore` to `StateProvider` to wire json-render to Pinia, VueUse, or any state management:

```typescript
import { createStateStore, type StateStore } from "@json-render/vue";

const store = createStateStore({ count: 0 });
```

```vue
<StateProvider :store="store">
  <Renderer :spec="spec" :registry="registry" />
</StateProvider>
```

## Dynamic Prop Expressions

Props support `$state`, `$bindState`, `$cond`, `$template`, `$computed`. Use `{ "$bindState": "/path" }` on the natural value prop for two-way binding.

## Visibility Conditions

```typescript
{ "$state": "/user/isAdmin" }
{ "$state": "/status", "eq": "active" }
{ "$state": "/maintenance", "not": true }
[ cond1, cond2 ]  // implicit AND
```

## Built-in Actions

`setState`, `pushState`, `removeState`, and `validateForm` are built into the Vue schema and handled by `ActionProvider`:

```json
{
  "action": "setState",
  "params": { "statePath": "/activeTab", "value": "settings" }
}
```

## Event System

Components use `emit(event)` to fire events, or `on(event)` for metadata (`shouldPreventDefault`, `bound`).

## Streaming

`useUIStream` and `useChatUI` return Vue Refs for streaming specs from an API.

## BaseComponentProps

For catalog-agnostic reusable components:

```typescript
import type { BaseComponentProps } from "@json-render/vue";

const Card = ({ props, children }: BaseComponentProps<{ title?: string }>) =>
  h("div", null, [props.title, children]);
```

## Key Exports

| Export | Purpose |
|--------|---------|
| `defineRegistry` | Create a type-safe component registry from a catalog |
| `Renderer` | Render a spec using a registry |
| `schema` | Element tree schema (from `@json-render/vue/schema`) |
| `StateProvider`, `ActionProvider`, `VisibilityProvider`, `ValidationProvider` | Context providers |
| `useStateStore`, `useStateValue`, `useBoundProp` | State composables |
| `useActions`, `useAction` | Action composables |
| `useFieldValidation`, `useIsVisible` | Validation and visibility |
| `useUIStream`, `useChatUI` | Streaming composables |
| `createStateStore` | Create in-memory `StateStore` |
| `BaseComponentProps` | Catalog-agnostic component props type |
