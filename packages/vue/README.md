# @json-render/vue

Vue 3 renderer for json-render. Turn JSON specs into Vue components with data binding, visibility, and actions.

## Installation

```bash
npm install @json-render/vue @json-render/core zod
```

Peer dependencies: `vue ^3.5.0` and `zod ^4.0.0`.

## Quick Start

### 1. Create a Catalog

```typescript
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/vue/schema";
import { z } from "zod";

export const catalog = defineCatalog(schema, {
  components: {
    Card: {
      props: z.object({
        title: z.string(),
        description: z.string().nullable(),
      }),
      description: "A card container",
    },
    Button: {
      props: z.object({
        label: z.string(),
        action: z.string(),
      }),
      description: "A clickable button",
    },
    Input: {
      props: z.object({
        value: z.union([z.string(), z.record(z.unknown())]).nullable(),
        label: z.string(),
        placeholder: z.string().nullable(),
      }),
      description: "Text input field with optional value binding",
    },
  },
  actions: {
    submit: { description: "Submit the form" },
    cancel: { description: "Cancel and close" },
  },
});
```

### 2. Define Component Implementations

Components are written using Vue's `h()` render function. `children` is a `VNode | VNode[]` — pass it directly to your container element.

`defineRegistry` conditionally requires the `actions` field only when the catalog declares actions. Catalogs with `actions: {}` can omit it entirely.

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
    Input: ({ props, bindings }) => {
      // Use bindings?.value with a watcher to implement two-way binding
      return h("label", null, [
        props.label,
        h("input", {
          placeholder: props.placeholder ?? "",
          value: props.value ?? "",
        }),
      ]);
    },
  },
  // actions stubs are required when the catalog declares actions:
  actions: {
    submit: async () => {},
    cancel: async () => {},
  },
});
```

> **Tip:** Use `useBoundProp(props.value, bindings?.value)` for two-way binding, or handle the `bindings` object directly in your component.

### 3. Render Specs

```vue
<script setup lang="ts">
import { StateProvider, ActionProvider, Renderer } from "@json-render/vue";
import { registry } from "./registry";

const spec = { /* ... */ };

function handleSubmit(params) {
  console.log("Submit", params);
}
</script>

<template>
  <StateProvider :initial-state="{ form: { name: '' } }">
    <ActionProvider :handlers="{ submit: handleSubmit }">
      <Renderer :spec="spec" :registry="registry" />
    </ActionProvider>
  </StateProvider>
</template>
```

## Spec Format

The Vue renderer uses the same flat element map format as the React renderer:

```typescript
interface Spec {
  root: string;                          // Key of the root element
  elements: Record<string, UIElement>;   // Flat map of elements by key
  state?: Record<string, unknown>;       // Optional initial state
}

interface UIElement {
  type: string;                          // Component name from catalog
  props: Record<string, unknown>;        // Component props
  children?: string[];                   // Keys of child elements
  visible?: VisibilityCondition;         // Visibility condition
}
```

Example spec:

```json
{
  "root": "card-1",
  "elements": {
    "card-1": {
      "type": "Card",
      "props": { "title": "Welcome" },
      "children": ["input-1", "btn-1"]
    },
    "input-1": {
      "type": "Input",
      "props": {
        "value": { "$bindState": "/form/name" },
        "label": "Name",
        "placeholder": "Enter name"
      }
    },
    "btn-1": {
      "type": "Button",
      "props": { "label": "Submit" },
      "children": []
    }
  }
}
```

## Providers

### StateProvider

Share data across components with JSON Pointer paths:

```vue
<StateProvider :initial-state="{ user: { name: 'John' } }">
  <!-- children -->
</StateProvider>
```

```typescript
// In composables:
const { state, get, set } = useStateStore();
const name = get("/user/name");  // "John"
set("/user/age", 25);

// state is a ShallowRef<StateModel> — access with state.value
console.log(state.value);
```

#### External Store (Controlled Mode)

Pass a `StateStore` to bypass the internal state and wire json-render to any state management library (Pinia, VueUse, etc.):

```typescript
import { createStateStore, type StateStore } from "@json-render/vue";

// Option 1: Use the built-in store outside of Vue
const store = createStateStore({ count: 0 });
```

```vue
<StateProvider :store="store">
  <!-- children -->
</StateProvider>
```

```typescript
// Mutate from anywhere — Vue will re-render automatically:
store.set("/count", 1);

// Option 2: Implement the StateStore interface with your own backend
const piniaStore: StateStore = {
  get: (path) => getByPath(myStore.$state, path),
  set: (path, value) => myStore.$patch(/* ... */),
  update: (updates) => myStore.$patch(/* ... */),
  getSnapshot: () => myStore.$state,
  subscribe: (listener) => myStore.$subscribe(listener),
};
```

When `store` is provided, `initialState` and `onStateChange` are ignored.

### ActionProvider

Handle actions from components:

```vue
<ActionProvider :handlers="{ submit: handleSubmit, cancel: handleCancel }">
  <!-- children -->
</ActionProvider>
```

### VisibilityProvider

Control element visibility based on data:

```vue
<VisibilityProvider>
  <!-- children -->
</VisibilityProvider>
```

```json
{
  "type": "Alert",
  "props": { "message": "Error!" },
  "visible": { "$state": "/form/hasError" }
}
```

### ValidationProvider

Add field validation:

```vue
<ValidationProvider>
  <!-- children -->
</ValidationProvider>
```

```typescript
// Use validation composable:
const { errors, validate } = useFieldValidation("/form/email", {
  checks: [
    { type: "required", message: "Email required" },
    { type: "email", message: "Invalid email" },
  ],
});
```

## Composables

| Composable | Purpose |
|------------|---------|
| `useStateStore()` | Access state context (`state` as `ShallowRef`, `get`, `set`, `update`) |
| `useStateValue(path)` | Get single value from state |
| `useStateBinding(path)` | Two-way data binding (deprecated — use `$bindState` instead) |
| `useIsVisible(condition)` | Check if a visibility condition is met |
| `useActions()` | Access action context |
| `useAction(binding)` | Get a single action dispatch function |
| `useFieldValidation(path, config)` | Field validation state |

> **Note:** `useStateStore().state` returns a `ShallowRef<StateModel>` — use `state.value` to access the underlying object. This differs from the React renderer where `state` is a plain object.

## Visibility Conditions

```typescript
// Truthiness check
{ "$state": "/user/isAdmin" }

// Auth state (use state path)
{ "$state": "/auth/isSignedIn" }

// Comparisons (flat style)
{ "$state": "/status", "eq": "active" }
{ "$state": "/count", "gt": 10 }

// Negation
{ "$state": "/maintenance", "not": true }

// Multiple conditions (implicit AND)
[
  { "$state": "/feature/enabled" },
  { "$state": "/maintenance", "not": true }
]

// Always / never
true   // always visible
false  // never visible
```

TypeScript helpers from `@json-render/core`:

```typescript
import { visibility } from "@json-render/core";

visibility.when("/path")       // { $state: "/path" }
visibility.unless("/path")     // { $state: "/path", not: true }
visibility.eq("/path", val)    // { $state: "/path", eq: val }
visibility.neq("/path", val)   // { $state: "/path", neq: val }
visibility.and(cond1, cond2)  // { $and: [cond1, cond2] }
visibility.always             // true
visibility.never              // false
```

## Dynamic Prop Expressions

Any prop value can use data-driven expressions that resolve at render time. The renderer resolves these transparently before passing props to components.

```json
{
  "type": "Badge",
  "props": {
    "label": { "$state": "/user/role" },
    "color": {
      "$cond": { "$state": "/user/role", "eq": "admin" },
      "$then": "red",
      "$else": "gray"
    }
  }
}
```

For two-way binding, use `{ "$bindState": "/path" }` on the natural value prop. Inside repeat scopes, use `{ "$bindItem": "field" }` instead. Components receive resolved `bindings` with the state path for each bound prop.

See [@json-render/core](../core/README.md) for full expression syntax.

## Built-in Actions

The `setState`, `pushState`, `removeState`, and `validateForm` actions are built into the Vue schema and handled automatically by `ActionProvider`. They are injected into AI prompts without needing to be declared in your catalog's `actions`. They update the state model, which triggers re-evaluation of visibility conditions and dynamic prop expressions:

```json
{
  "type": "Button",
  "props": { "label": "Switch Tab" },
  "on": {
    "press": {
      "action": "setState",
      "params": { "statePath": "/activeTab", "value": "settings" }
    }
  },
  "children": []
}
```

## Component Props

When using `defineRegistry`, components receive these props via their render function:

```typescript
import type { VNode } from "vue";

interface ComponentContext<P> {
  props: P;                          // Typed props from the catalog (expressions resolved)
  children?: VNode | VNode[];        // Rendered children (for container components)
  emit: (event: string) => void;     // Emit a named event (always defined)
  on: (event: string) => EventHandle; // Get event handle with metadata
  loading?: boolean;                 // Whether the parent is loading
  bindings?: Record<string, string>; // State paths for $bindState/$bindItem expressions
}

interface EventHandle {
  emit: () => void;            // Fire the event
  shouldPreventDefault: boolean; // Whether any binding requested preventDefault
  bound: boolean;              // Whether any handler is bound
}
```

Use `emit("press")` for simple event firing. Use `on("click")` when you need to check metadata like `shouldPreventDefault` or `bound`:

```typescript
Link: ({ props, on }) => {
  const click = on("click");
  return h("a", {
    href: props.href,
    onClick: (e: MouseEvent) => {
      if (click.shouldPreventDefault) e.preventDefault();
      click.emit();
    },
  }, props.label);
},
```

### `BaseComponentProps`

For building reusable component libraries that are not tied to a specific catalog, use the catalog-agnostic `BaseComponentProps` type:

```typescript
import type { BaseComponentProps } from "@json-render/vue";

const Card = ({ props, children }: BaseComponentProps<{ title?: string }>) =>
  h("div", null, [props.title, children]);
```

## Generate AI Prompts

```typescript
const systemPrompt = catalog.prompt();
// Returns detailed prompt with component/action descriptions
```

## Full Example

```typescript
import { h } from "vue";
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/vue/schema";
import { defineRegistry, Renderer, StateProvider } from "@json-render/vue";
import { z } from "zod";

const catalog = defineCatalog(schema, {
  components: {
    Greeting: {
      props: z.object({ name: z.string() }),
      description: "Displays a greeting",
    },
  },
  actions: {},
});

const { registry } = defineRegistry(catalog, {
  components: {
    Greeting: ({ props }) => h("h1", null, `Hello, ${props.name}!`),
  },
});

const spec = {
  root: "greeting-1",
  elements: {
    "greeting-1": {
      type: "Greeting",
      props: { name: "World" },
      children: [],
    },
  },
};

// In your App.vue:
// <StateProvider>
//   <Renderer :spec="spec" :registry="registry" />
// </StateProvider>
```

## Key Exports

| Export | Purpose |
|--------|---------|
| `defineRegistry` | Create a type-safe component registry from a catalog |
| `Renderer` | Render a spec using a registry |
| `schema` | Element tree schema (includes built-in actions: `setState`, `pushState`, `removeState`) |
| `useStateStore` | Access state context (`state` is `ShallowRef<StateModel>`) |
| `useStateValue` | Get single value from state |
| `useActions` | Access actions context |
| `useAction` | Get a single action dispatch function |
| `createStateStore` | Create a framework-agnostic in-memory `StateStore` |

### Types

| Export | Purpose |
|--------|---------|
| `ComponentContext` | Typed component render function context (catalog-aware) |
| `BaseComponentProps` | Catalog-agnostic base type for reusable component libraries |
| `EventHandle` | Event handle with `emit()`, `shouldPreventDefault`, `bound` |
| `ActionProviderProps` | Props for `ActionProvider` |
| `ValidationProviderProps` | Props for `ValidationProvider` |
| `ComponentFn` | Component render function type |
| `SetState` | State setter type |
| `StateModel` | State model type |
| `StateStore` | Interface for plugging in external state management |

## Differences from `@json-render/react`

| API | React | Vue | Note |
|-----|-------|-----|------|
| `useStateStore().state` | `StateModel` | `ShallowRef<StateModel>` | Vue reactivity; use `state.value` |
| `children` type | `React.ReactNode` | `VNode \| VNode[]` | Platform-specific |
| `useBoundProp` | exported | exported | Same API; returns `[value, setValue]` |
| Streaming hooks | `useUIStream`, `useChatUI` | `useUIStream`, `useChatUI` | Same API; returns Vue `Ref` values |
