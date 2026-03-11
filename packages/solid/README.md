# @json-render/solid

SolidJS renderer for json-render. Turn JSON specs into Solid components with data binding, visibility, actions, validation, and streaming.

## Installation

```bash
npm install @json-render/core @json-render/solid zod
```

Peer dependencies: `solid-js ^1.9.0` and `zod ^4.0.0`.

## Quick Start

### 1. Create a Catalog

```typescript
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/solid/schema";
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
      description: "Text input with optional state binding",
    },
  },
  actions: {
    submit: { description: "Submit the form" },
    cancel: { description: "Cancel and close" },
  },
});
```

### 2. Define Component Implementations

`defineRegistry` conditionally requires the `actions` field only when the catalog declares actions.

```tsx
import { defineRegistry, useBoundProp } from "@json-render/solid";
import { catalog } from "./catalog";

export const { registry } = defineRegistry(catalog, {
  components: {
    Card: (renderProps) => (
      <div class="card">
        <h3>{renderProps.element.props.title as string}</h3>
        {renderProps.children}
      </div>
    ),
    Button: (renderProps) => (
      <button onClick={() => renderProps.emit("press")}>
        {renderProps.element.props.label as string}
      </button>
    ),
    Input: (renderProps) => {
      const [value, setValue] = useBoundProp(
        renderProps.element.props.value,
        renderProps.bindings?.value,
      );
      return (
        <label>
          {renderProps.element.props.label as string}
          <input
            value={String(value() ?? "")}
            placeholder={String(renderProps.element.props.placeholder ?? "")}
            onInput={(e) => setValue(e.currentTarget.value)}
          />
        </label>
      );
    },
  },
  actions: {
    submit: async () => {},
    cancel: async () => {},
  },
});
```

### 3. Render Specs

```tsx
import { Renderer, StateProvider, ActionProvider } from "@json-render/solid";
import { registry } from "./registry";

export function App(props: { spec: any }) {
  return (
    <StateProvider initialState={{ form: { name: "" } }}>
      <ActionProvider handlers={{ submit: () => console.log("submit") }}>
        <Renderer spec={props.spec} registry={registry} />
      </ActionProvider>
    </StateProvider>
  );
}
```

## Spec Format

`@json-render/solid` uses the same flat element map format as React/Vue:

```typescript
interface Spec {
  root: string;
  elements: Record<string, UIElement>;
  state?: Record<string, unknown>;
}

interface UIElement {
  type: string;
  props: Record<string, unknown>;
  children?: string[];
  visible?: VisibilityCondition;
  watch?: Record<string, ActionBinding | ActionBinding[]>;
}
```

## Providers

| Provider              | Purpose                                              |
| --------------------- | ---------------------------------------------------- |
| `StateProvider`       | State model and JSON Pointer read/write APIs         |
| `ActionProvider`      | Action dispatch, loading tracking, confirmation flow |
| `VisibilityProvider`  | Visibility condition evaluation from current state   |
| `ValidationProvider`  | Field-level and full-form validation                 |
| `RepeatScopeProvider` | Repeat context (`$item`, `$index`, `$bindItem`)      |
| `JSONUIProvider`      | Combined provider wiring for renderer trees          |

### External Store (Controlled Mode)

Pass a `StateStore` to `StateProvider`, `JSONUIProvider`, or the component returned by `createRenderer`.
When `store` is provided, `initialState` and `onStateChange` are ignored.

```tsx
import { createStateStore, StateProvider } from "@json-render/solid";

const store = createStateStore({ count: 0 });

<StateProvider store={store}>{/* ... */}</StateProvider>;
```

## Hooks

| Hook                                          | Purpose                                               |
| --------------------------------------------- | ----------------------------------------------------- |
| `useStateStore()`                             | Access `state`, `get`, `set`, `update`, `getSnapshot` |
| `useStateValue(path)`                         | Read a value by JSON Pointer path via accessor        |
| `useStateBinding(path)`                       | Legacy two-way binding helper returning an accessor   |
| `useVisibility()` / `useIsVisible()`          | Visibility context and checks                         |
| `useActions()` / `useAction()`                | Action context and single-action helper               |
| `useValidation()` / `useOptionalValidation()` | Validation context (throwing/non-throwing)            |
| `useFieldValidation(path, config)`            | Field state accessors plus validate/touch/clear       |
| `useBoundProp(value, binding)`                | Fine-grained two-way binding helper                   |
| `useUIStream(options)`                        | Stream UI specs from an endpoint                      |
| `useChatUI(options)`                          | Chat-style spec generation hook                       |

## Built-in Actions

These actions are available in the Solid schema and handled by `ActionProvider`:

- `setState`
- `pushState`
- `removeState`
- `validateForm`

`setState`/`pushState`/`removeState` mutate the state model. `validateForm` validates registered fields and writes `{ valid, errors }` to state (`/formValidation` by default).

## Events and Action Binding

Components can use either `emit("event")` or `on("event")`.

- `emit` fires named event bindings directly.
- `on` returns an `EventHandle` with `emit`, `bound`, and `shouldPreventDefault`.

This mirrors the React package API while preserving Solid's fine-grained reactivity.

## Streaming

`useUIStream` and `useChatUI` support JSON patch streaming and mixed text/spec data parts.

```tsx
import { useUIStream } from "@json-render/solid";

const stream = useUIStream({ api: "/api/generate" });
await stream.send("Build me a dashboard");
```

## Key Exports

| Export             | Purpose                                                                    |
| ------------------ | -------------------------------------------------------------------------- |
| `defineRegistry`   | Create catalog-aware component and action registry helpers                 |
| `Renderer`         | Render a `Spec` with a component registry                                  |
| `createRenderer`   | Build an app-level renderer with provider wiring                           |
| `JSONUIProvider`   | Combined provider tree (`state` + `visibility` + `validation` + `actions`) |
| `schema`           | Solid element schema with built-in actions                                 |
| `createStateStore` | Framework-agnostic in-memory `StateStore`                                  |

### Types

| Export                      | Purpose                                                  |
| --------------------------- | -------------------------------------------------------- |
| `ComponentContext`          | Catalog-aware component context type                     |
| `BaseComponentProps`        | Catalog-agnostic component props type                    |
| `EventHandle`               | Event metadata (`emit`, `bound`, `shouldPreventDefault`) |
| `StateStore`                | Controlled state backend interface                       |
| `StateModel`                | Renderer state model type                                |
| `SolidSchema` / `SolidSpec` | Solid schema/spec types                                  |

## Differences from `@json-render/react`

Most APIs are intentionally aligned, but there are runtime behavior differences due to Solid:

- Solid components run once, then update via signals.
- Keep changing reads inside JSX expressions, `createMemo`, or `createEffect`.
- Avoid props destructuring in component signatures when values should remain reactive.
- Hooks that read changing state return accessors; call them inside JSX or effects.

## Documentation

Full docs: [json-render.dev/docs/api/solid](https://json-render.dev/docs/api/solid)

## License

Apache-2.0
