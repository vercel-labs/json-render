---
name: solid
description: SolidJS renderer for json-render. Use when building @json-render/solid catalogs/registries, wiring Renderer providers, implementing bindings/actions, or troubleshooting Solid-specific reactivity patterns.
---

# @json-render/solid

`@json-render/solid` renders json-render specs into Solid component trees with fine-grained reactivity.

## Quick Start

```tsx
import { Renderer, JSONUIProvider } from "@json-render/solid";
import type { Spec } from "@json-render/solid";
import { registry } from "./registry";

export function App(props: { spec: Spec | null }) {
  return (
    <JSONUIProvider registry={registry} initialState={{}}>
      <Renderer spec={props.spec} registry={registry} />
    </JSONUIProvider>
  );
}
```

## Create a Catalog

```typescript
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/solid/schema";
import { z } from "zod";

export const catalog = defineCatalog(schema, {
  components: {
    Button: {
      props: z.object({
        label: z.string(),
        variant: z.enum(["primary", "secondary"]).nullable(),
      }),
      description: "Clickable button",
    },
    Card: {
      props: z.object({ title: z.string() }),
      description: "Card container",
    },
  },
  actions: {
    submit: { description: "Submit data" },
  },
});
```

## Define Components

Components receive `ComponentRenderProps` from the renderer:

```ts
interface ComponentRenderProps<P = Record<string, unknown>> {
  element: UIElement<string, P>;
  children?: JSX.Element;
  emit: (event: string) => void;
  on: (event: string) => EventHandle;
  bindings?: Record<string, string>;
  loading?: boolean;
}
```

Example:

```tsx
import type { BaseComponentProps } from "@json-render/solid";

export function Button(props: BaseComponentProps<{ label: string }>) {
  return (
    <button onClick={() => props.emit("press")}>{props.props.label}</button>
  );
}
```

## Create a Registry

```typescript
import { defineRegistry } from "@json-render/solid";
import { catalog } from "./catalog";
import { Card } from "./Card";
import { Button } from "./Button";

const { registry, handlers, executeAction } = defineRegistry(catalog, {
  components: {
    Card,
    Button,
  },
  actions: {
    submit: async (params, setState, state) => {
      // custom action logic
    },
  },
});
```

## Spec Structure

```json
{
  "root": "card1",
  "elements": {
    "card1": {
      "type": "Card",
      "props": { "title": "Hello" },
      "children": ["btn1"]
    },
    "btn1": {
      "type": "Button",
      "props": { "label": "Click me" },
      "on": {
        "press": { "action": "submit" }
      }
    }
  }
}
```

## Providers

- `StateProvider`: state model read/write and controlled mode via `store`
- `VisibilityProvider`: evaluates `visible` conditions
- `ValidationProvider`: field validation + `validateForm` integration
- `ActionProvider`: runs built-in and custom actions
- `JSONUIProvider`: combined provider wrapper

## Hooks

- `useStateStore`, `useStateValue`, `useStateBinding`
- `useVisibility`, `useIsVisible`
- `useActions`, `useAction`
- `useValidation`, `useOptionalValidation`, `useFieldValidation`
- `useBoundProp`
- `useUIStream`, `useChatUI`

## Built-in Actions

Handled automatically by `ActionProvider`:

- `setState`
- `pushState`
- `removeState`
- `validateForm`

## Dynamic Props and Bindings

Supported expression forms include:

- `{"$state": "/path"}`
- `{"$bindState": "/path"}`
- `{"$bindItem": "field"}`
- `{"$template": "Hi ${/user/name}"}`
- `{"$computed": "fn", "args": {...}}`
- `{"$cond": <condition>, "$then": <value>, "$else": <value>}`

Use `useBoundProp` in components for writable bound values:

```tsx
import { useBoundProp } from "@json-render/solid";

function Input(props: BaseComponentProps<{ value?: string }>) {
  const [value, setValue] = useBoundProp(
    props.props.value,
    props.bindings?.value,
  );
  return (
    <input
      value={String(value() ?? "")}
      onInput={(e) => setValue(e.currentTarget.value)}
    />
  );
}
```

`useStateValue`, `useStateBinding`, and the `state` / `errors` / `isValid` fields from `useFieldValidation` are reactive accessors in Solid. Call them as functions inside JSX, `createMemo`, or `createEffect`.

## Solid Reactivity Rules

- Do not destructure component props in function signatures when values need to stay reactive.
- Keep changing reads inside JSX expressions, `createMemo`, or `createEffect`.
- Context values are exposed through getter-based objects so consumers always observe live signals.

## Streaming UI

```tsx
import { useUIStream, Renderer } from "@json-render/solid";

const stream = useUIStream({ api: "/api/generate-ui" });
await stream.send("Create a support dashboard");

<Renderer
  spec={stream.spec}
  registry={registry}
  loading={stream.isStreaming}
/>;
```

Use `useChatUI` for chat + UI generation flows.
