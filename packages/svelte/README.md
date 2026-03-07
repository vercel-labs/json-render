# @json-render/svelte

Svelte 5 renderer for `@json-render/core`. Turn JSON specs into Svelte components with runes-based reactivity.

## Installation

```bash
npm install @json-render/core @json-render/svelte
```

Peer dependencies: `svelte ^5.0.0` and `zod ^4.0.0`.

## Quick Start

### 1. Create a Catalog

```typescript
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/svelte/schema";
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
  },
  actions: {
    submit: { description: "Submit the form" },
  },
});
```

### 2. Define Component Implementations

```typescript
import { defineRegistry } from "@json-render/svelte";
import { catalog } from "./catalog";

export const { registry } = defineRegistry(catalog, {
  components: {
    Card: ({ props, children }) => /* Svelte 5 snippet */,
    Button: ({ props, emit }) => /* Svelte 5 snippet */,
  },
  actions: {
    submit: async (params) => { /* handle submit */ },
  },
});
```

### 3. Render Specs

```svelte
<script>
  import { Renderer, StateProvider, ActionProvider } from "@json-render/svelte";
  import { registry } from "./registry";

  const spec = { /* ... */ };
</script>

<StateProvider initialState={{ form: { name: "" } }}>
  <ActionProvider handlers={{ submit: handleSubmit }}>
    <Renderer {spec} {registry} />
  </ActionProvider>
</StateProvider>
```

## Providers

| Provider | Purpose |
|----------|---------|
| `StateProvider` | Share state across components (JSON Pointer paths). Accepts optional `store` prop for controlled mode. |
| `ActionProvider` | Handle actions dispatched via the event system |
| `VisibilityProvider` | Enable conditional rendering based on state |
| `ValidationProvider` | Form field validation |
| `RepeatScopeProvider` | Repeat scope for list rendering |
| `FunctionsContextProvider` | Register `$computed` functions |
| `JsonUIProvider` | All-in-one provider combining state, actions, visibility, validation, and functions |

## Context Accessors

Svelte 5 uses `getContext`-based accessors instead of hooks:

| Accessor | Purpose |
|----------|---------|
| `getStateContext()` | Access state context (`state`, `get`, `set`) |
| `getStateValue(path)` | Get single value from state |
| `getBoundProp(value, binding)` | Two-way binding for `$bindState`/`$bindItem` |
| `getVisibilityContext()` | Access visibility context |
| `isVisible(condition)` | Check if a visibility condition is met |
| `getActionContext()` | Access action context |
| `getAction(binding)` | Get a single action dispatch function |
| `getValidationContext()` | Access validation context |
| `getFieldValidation(path, config)` | Field validation state |
| `getRepeatScope()` | Access current repeat scope |
| `getFunctions()` | Access registered computed functions |

## Streaming

```typescript
import { createUIStream, createChatUI } from "@json-render/svelte";

const stream = createUIStream({ endpoint: "/api/generate" });

// Or for chat-style UI:
const chat = createChatUI({ endpoint: "/api/chat" });
```

## Key Exports

| Export | Purpose |
|--------|---------|
| `defineRegistry` | Create a type-safe component registry from a catalog |
| `createRenderer` | Create a renderer function from a registry |
| `Renderer` | Render a spec using a registry |
| `CatalogRenderer` | Render with automatic provider wiring |
| `JsonUIProvider` | All-in-one provider |
| `schema` | Element tree schema (includes built-in state actions) |
| `createUIStream` | Stream specs from an API endpoint |
| `createChatUI` | Chat-style streaming interface |
| `flatToTree` | Convert flat spec to tree format |
| `ConfirmDialog` | Confirmation dialog component |
| `ConfirmDialogManager` | Manage multiple confirmation dialogs |

### Types

| Export | Purpose |
|--------|---------|
| `ComponentContext` | Typed component render function context (catalog-aware) |
| `BaseComponentProps` | Catalog-agnostic base type for reusable component libraries |
| `EventHandle` | Event handle with `emit()`, `shouldPreventDefault`, `bound` |
| `ComponentFn` | Component render function type |
| `SetState` | State setter type |
| `StateModel` | State model type |
| `SvelteSchema` | Schema type for the Svelte renderer |
| `SvelteSpec` | Spec type for the Svelte renderer |

## Documentation

Full API reference: [json-render.dev/docs/api/svelte](https://json-render.dev/docs/api/svelte).

## License

Apache-2.0
