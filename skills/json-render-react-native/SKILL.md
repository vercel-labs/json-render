---
name: json-render-react-native
description: React Native renderer for json-render that turns JSON specs into native mobile UIs. Use when working with @json-render/react-native, building React Native UIs from JSON, creating mobile component catalogs, or rendering AI-generated specs on mobile.
---

# @json-render/react-native

React Native renderer that converts JSON specs into native mobile component trees with standard components, data binding, visibility, actions, and dynamic props.

## Quick Start

```typescript
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react-native/schema";
import {
  standardComponentDefinitions,
  standardActionDefinitions,
} from "@json-render/react-native/catalog";
import { defineRegistry, Renderer, type Components } from "@json-render/react-native";
import { z } from "zod";

// Create catalog with standard + custom components
const catalog = defineCatalog(schema, {
  components: {
    ...standardComponentDefinitions,
    Icon: {
      props: z.object({ name: z.string(), size: z.number().nullable(), color: z.string().nullable() }),
      slots: [],
      description: "Icon display",
    },
  },
  actions: standardActionDefinitions,
});

// Register only custom components (standard ones are built-in)
const { registry } = defineRegistry(catalog, {
  components: {
    Icon: ({ props }) => <Ionicons name={props.name} size={props.size ?? 24} />,
  } as Components<typeof catalog>,
});

// Render
function App({ spec }) {
  return (
    <StateProvider initialState={{}}>
      <VisibilityProvider>
        <ActionProvider handlers={{}}>
          <Renderer spec={spec} registry={registry} />
        </ActionProvider>
      </VisibilityProvider>
    </StateProvider>
  );
}
```

## Standard Components

### Layout
- `Container` - wrapper with padding, background, border radius
- `Row` - horizontal flex layout with gap, alignment
- `Column` - vertical flex layout with gap, alignment
- `ScrollContainer` - scrollable area (vertical or horizontal)
- `SafeArea` - safe area insets for notch/home indicator
- `Pressable` - touchable wrapper that triggers actions on press
- `Spacer` - fixed or flexible spacing
- `Divider` - thin line separator

### Content
- `Heading` - heading text (levels 1-6)
- `Paragraph` - body text
- `Label` - small label text
- `Image` - image display with sizing modes
- `Avatar` - circular avatar image
- `Badge` - small status badge
- `Chip` - tag/chip for categories

### Input
- `Button` - pressable button with variants
- `TextInput` - text input field
- `Switch` - toggle switch
- `Checkbox` - checkbox with label
- `Slider` - range slider
- `SearchBar` - search input

### Feedback
- `Spinner` - loading indicator
- `ProgressBar` - progress indicator

### Composite
- `Card` - card container with optional header
- `ListItem` - list row with title, subtitle, accessory
- `Modal` - bottom sheet modal

## Visibility Conditions

Use `visible` on elements. Syntax: `{ "$state": "/path" }`, `{ "$state": "/path", "eq": value }`, `{ "$state": "/path", "not": true }`, `[ cond1, cond2 ]` for AND.

## Pressable + setState Pattern

Use `Pressable` with the built-in `setState` action for interactive UIs like tab bars:

```json
{
  "type": "Pressable",
  "props": {
    "action": "setState",
    "actionParams": { "statePath": "/activeTab", "value": "home" }
  },
  "children": ["home-icon", "home-label"]
}
```

## Dynamic Prop Expressions

Any prop value can be a data-driven expression resolved at render time:

- **`{ "$state": "/state/key" }`** - reads from state model (one-way read)
- **`{ "$bindState": "/path" }`** - two-way binding: use on the natural value prop (value, checked, pressed, etc.) of form components.
- **`{ "$bindItem": "field" }`** - two-way binding to a repeat item field. Use inside repeat scopes.
- **`{ "$cond": <condition>, "$then": <value>, "$else": <value> }`** - conditional value

```json
{
  "type": "TextInput",
  "props": {
    "value": { "$bindState": "/form/email" },
    "placeholder": "Email"
  }
}
```

Components do not use a `statePath` prop for two-way binding. Use `{ "$bindState": "/path" }` on the natural value prop instead.

## Built-in Actions

The `setState` action is handled automatically by `ActionProvider` and updates the state model directly, which re-evaluates visibility conditions and dynamic prop expressions:

```json
{ "action": "setState", "actionParams": { "statePath": "/activeTab", "value": "home" } }
```

## Providers

| Provider | Purpose |
|----------|---------|
| `StateProvider` | Share state across components (JSON Pointer paths). Accepts optional `store` prop for controlled mode. |
| `ActionProvider` | Handle actions dispatched from components |
| `VisibilityProvider` | Enable conditional rendering based on state |
| `ValidationProvider` | Form field validation |

### External Store (Controlled Mode)

Pass a `StateStore` to `StateProvider` (or `JSONUIProvider` / `createRenderer`) to use external state management:

```tsx
import { createStateStore, type StateStore } from "@json-render/react-native";

const store = createStateStore({ count: 0 });

<StateProvider store={store}>{children}</StateProvider>

store.set("/count", 1); // React re-renders automatically
```

When `store` is provided, `initialState` and `onStateChange` are ignored.

## Key Exports

| Export | Purpose |
|--------|---------|
| `defineRegistry` | Create a type-safe component registry from a catalog |
| `Renderer` | Render a spec using a registry |
| `schema` | React Native element tree schema |
| `standardComponentDefinitions` | Catalog definitions for all standard components |
| `standardActionDefinitions` | Catalog definitions for standard actions |
| `standardComponents` | Pre-built component implementations |
| `createStandardActionHandlers` | Create handlers for standard actions |
| `useStateStore` | Access state context |
| `useStateValue` | Get single value from state |
| `useBoundProp` | Two-way state binding via `$bindState`/`$bindItem` |
| `useStateBinding` | _(deprecated)_ Legacy two-way binding by path |
| `useActions` | Access actions context |
| `useAction` | Get a single action dispatch function |
| `useUIStream` | Stream specs from an API endpoint |
| `createStateStore` | Create a framework-agnostic in-memory `StateStore` |
| `StateStore` | Interface for plugging in external state management |
