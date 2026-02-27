# @json-render/react

React renderer for json-render. Turn JSON specs into React components with data binding, visibility, and actions.

## Installation

```bash
npm install @json-render/react @json-render/core zod
```

## Quick Start

### 1. Create a Catalog

```typescript
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
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

`defineRegistry` conditionally requires the `actions` field only when the catalog declares actions. Catalogs with `actions: {}` can omit it entirely.

```tsx
import { defineRegistry, useBoundProp } from "@json-render/react";
import { catalog } from "./catalog";

export const { registry } = defineRegistry(catalog, {
  components: {
    Card: ({ props, children }) => (
      <div className="card">
        <h3>{props.title}</h3>
        {props.description && <p>{props.description}</p>}
        {children}
      </div>
    ),
    Button: ({ props, emit }) => (
      <button onClick={() => emit("press")}>
        {props.label}
      </button>
    ),
    Input: ({ props, bindings }) => {
      const [value, setValue] = useBoundProp(props.value, bindings?.value);
      return (
        <label>
          {props.label}
          <input
            placeholder={props.placeholder ?? ""}
            value={value ?? ""}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
      );
    },
  },
});
```

### 3. Render Specs

```tsx
import { Renderer, StateProvider, ActionProvider } from "@json-render/react";
import { registry } from "./registry";

function App({ spec }) {
  return (
    <StateProvider initialState={{ form: { name: "" } }}>
      <ActionProvider handlers={{
        submit: () => console.log("Submit"),
      }}>
        <Renderer spec={spec} registry={registry} />
      </ActionProvider>
    </StateProvider>
  );
}
```

## Spec Format

The React renderer uses a flat element map format:

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

## Contexts

### StateProvider

Share data across components with JSON Pointer paths:

```tsx
<StateProvider initialState={{ user: { name: "John" } }}>
  {children}
</StateProvider>

// In components:
const { state, get, set } = useStateStore();
const name = get("/user/name");  // "John"
set("/user/age", 25);
```

#### External Store (Controlled Mode)

For full control over state, pass a `StateStore` to bypass the internal state and wire json-render to any state management library (Redux, Zustand, XState, etc.):

```tsx
import { createStateStore, type StateStore } from "@json-render/react";

// Option 1: Use the built-in store outside of React
const store = createStateStore({ count: 0 });

<StateProvider store={store}>
  {children}
</StateProvider>

// Mutate from anywhere — React will re-render automatically:
store.set("/count", 1);

// Option 2: Implement the StateStore interface with your own backend
const zustandStore: StateStore = {
  get: (path) => getByPath(useStore.getState(), path),
  set: (path, value) => useStore.setState(prev => { /* ... */ }),
  update: (updates) => useStore.setState(prev => { /* ... */ }),
  getSnapshot: () => useStore.getState(),
  subscribe: (listener) => useStore.subscribe(listener),
};
```

When `store` is provided, `initialState` and `onStateChange` are ignored. The store is the single source of truth. The same `store` prop is available on `createRenderer`, `JSONUIProvider`, and `StateProvider`.

### ActionProvider

Handle actions from components:

```tsx
<ActionProvider
  handlers={{
    submit: (params) => handleSubmit(params),
    cancel: () => handleCancel(),
  }}
>
  {children}
</ActionProvider>
```

### VisibilityProvider

Control element visibility based on data:

```tsx
<VisibilityProvider>
  {children}
</VisibilityProvider>

// Elements can use visibility conditions:
{
  "type": "Alert",
  "props": { "message": "Error!" },
  "visible": { "$state": "/form/hasError" }
}
```

### ValidationProvider

Add field validation:

```tsx
<ValidationProvider>
  {children}
</ValidationProvider>

// Use validation hooks:
const { errors, validate } = useFieldValidation("/form/email", {
  checks: [
    { type: "required", message: "Email required" },
    { type: "email", message: "Invalid email" },
  ],
});
```

## Hooks

| Hook | Purpose |
|------|---------|
| `useStateStore()` | Access state context (`state`, `get`, `set`, `update`) |
| `useStateValue(path)` | Get single value from state |
| `useStateBinding(path)` | Two-way data binding (returns `[value, setValue]`) |
| `useIsVisible(condition)` | Check if a visibility condition is met |
| `useActions()` | Access action context |
| `useAction(name)` | Get a single action dispatch function |
| `useFieldValidation(path, config)` | Field validation state |
| `useOptionalValidation()` | Non-throwing validation context (returns `null` if no provider) |
| `useUIStream(options)` | Stream specs from an API endpoint |

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

For two-way binding, use `{ "$bindState": "/path" }` on the natural value prop (e.g. `value`, `checked`, `pressed`). Inside repeat scopes, use `{ "$bindItem": "field" }` instead. Components receive resolved `bindings` with the state path for each bound prop; use `useBoundProp(props.value, bindings?.value)` to get `[value, setValue]`.

### `$template` and `$computed`

```json
{
  "label": { "$template": "Hello, ${/user/name}!" },
  "fullName": {
    "$computed": "fullName",
    "args": {
      "first": { "$state": "/form/firstName" },
      "last": { "$state": "/form/lastName" }
    }
  }
}
```

Register functions via the `functions` prop on `JSONUIProvider` or `createRenderer`:

```tsx
<JSONUIProvider
  spec={spec}
  catalog={catalog}
  functions={{ fullName: (args) => `${args.first} ${args.last}` }}
>
```

See [@json-render/core](../core/README.md) for full expression syntax.

## State Watchers

Elements can declare a `watch` field to trigger actions when state values change:

```json
{
  "type": "Select",
  "props": {
    "label": "Country",
    "value": { "$bindState": "/form/country" },
    "options": ["US", "Canada", "UK"]
  },
  "watch": {
    "/form/country": {
      "action": "loadCities",
      "params": { "country": { "$state": "/form/country" } }
    }
  },
  "children": []
}
```

`watch` is a top-level field on elements (sibling of `type`/`props`/`children`), not inside `props`. Watchers only fire on value changes, not on initial render.

## Built-in Actions

The `setState`, `pushState`, `removeState`, and `validateForm` actions are built into the React schema and handled automatically by `ActionProvider`. They are injected into AI prompts without needing to be declared in your catalog's `actions`:

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

### `validateForm`

Validate all registered form fields at once and write the result to state:

```json
{
  "type": "Button",
  "props": { "label": "Submit" },
  "on": {
    "press": [
      { "action": "validateForm", "params": { "statePath": "/formResult" } },
      { "action": "submitForm" }
    ]
  },
  "children": []
}
```

Writes `{ valid: boolean, errors: Record<string, string[]> }` to the specified state path (defaults to `/formValidation`).

## Component Props

When using `defineRegistry`, components receive these props:

```typescript
interface ComponentContext<P> {
  props: P;                    // Typed props from the catalog (expressions resolved)
  children?: React.ReactNode;  // Rendered children
  emit: (event: string) => void;   // Emit a named event (always defined)
  on: (event: string) => EventHandle; // Get event handle with metadata
  loading?: boolean;           // Whether the parent is loading
  bindings?: Record<string, string>;  // State paths for $bindState/$bindItem expressions (e.g. bindings.value)
}

interface EventHandle {
  emit: () => void;            // Fire the event
  shouldPreventDefault: boolean; // Whether any binding requested preventDefault
  bound: boolean;              // Whether any handler is bound
}
```

Use `emit("press")` for simple event firing. Use `on("click")` when you need to check metadata like `shouldPreventDefault` or `bound`:

```tsx
Link: ({ props, on }) => {
  const click = on("click");
  return (
    <a
      href={props.href}
      onClick={(e) => {
        if (click.shouldPreventDefault) e.preventDefault();
        click.emit();
      }}
    >
      {props.label}
    </a>
  );
},
```

Use `bindings?.value`, `bindings?.checked`, etc. with `useBoundProp()` for two-way bound form components.

### `BaseComponentProps`

For building reusable component libraries that are not tied to a specific catalog (e.g. `@json-render/shadcn`), use the catalog-agnostic `BaseComponentProps` type:

```typescript
import type { BaseComponentProps } from "@json-render/react";

const Card = ({ props, children }: BaseComponentProps<{ title?: string }>) => (
  <div>{props.title}{children}</div>
);
```

## Generate AI Prompts

```typescript
const systemPrompt = catalog.prompt();
// Returns detailed prompt with component/action descriptions
```

## Full Example

```tsx
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { defineRegistry, Renderer } from "@json-render/react";
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
    Greeting: ({ props }) => <h1>Hello, {props.name}!</h1>,
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

function App() {
  return <Renderer spec={spec} registry={registry} />;
}
```

## Key Exports

| Export | Purpose |
|--------|---------|
| `defineRegistry` | Create a type-safe component registry from a catalog |
| `Renderer` | Render a spec using a registry |
| `schema` | Element tree schema (includes built-in actions: `setState`, `pushState`, `removeState`, `validateForm`) |
| `useStateStore` | Access state context |
| `useStateValue` | Get single value from state |
| `useBoundProp` | Two-way binding for `$bindState`/`$bindItem` expressions |
| `useActions` | Access actions context |
| `useAction` | Get a single action dispatch function |
| `useUIStream` | Stream specs from an API endpoint |
| `createStateStore` | Create a framework-agnostic in-memory `StateStore` |

### Types

| Export | Purpose |
|--------|---------|
| `ComponentContext` | Typed component render function context (catalog-aware) |
| `BaseComponentProps` | Catalog-agnostic base type for reusable component libraries |
| `EventHandle` | Event handle with `emit()`, `shouldPreventDefault`, `bound` |
| `ComponentFn` | Component render function type |
| `SetState` | State setter type |
| `StateModel` | State model type |
| `StateStore` | Interface for plugging in external state management |
