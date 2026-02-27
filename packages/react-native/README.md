# @json-render/react-native

React Native renderer for json-render. Turn JSON specs into native mobile UIs with standard components, data binding, visibility, actions, and dynamic props.

## Installation

```bash
npm install @json-render/react-native @json-render/core zod
```

## Quick Start

### 1. Create a Catalog

```typescript
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react-native/schema";
import {
  standardComponentDefinitions,
  standardActionDefinitions,
} from "@json-render/react-native/catalog";
import { z } from "zod";

export const catalog = defineCatalog(schema, {
  components: {
    ...standardComponentDefinitions,
    // Add custom components
    Icon: {
      props: z.object({
        name: z.string(),
        size: z.number().nullable(),
        color: z.string().nullable(),
      }),
      slots: [],
      description: "Icon display using Ionicons",
    },
  },
  actions: standardActionDefinitions,
});
```

### 2. Define Custom Component Implementations

```tsx
import { defineRegistry, type Components } from "@json-render/react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { catalog } from "./catalog";

export const { registry } = defineRegistry(catalog, {
  components: {
    Icon: ({ props }) => (
      <Ionicons
        name={props.name as keyof typeof Ionicons.glyphMap}
        size={props.size ?? 24}
        color={props.color ?? "#111827"}
      />
    ),
  } as Components<typeof catalog>,
});
```

Standard components (Container, Row, Column, Button, TextInput, etc.) are included by default. You only need to register custom ones.

### 3. Render Specs

```tsx
import {
  Renderer,
  StateProvider,
  VisibilityProvider,
  ActionProvider,
  ValidationProvider,
} from "@json-render/react-native";
import { registry } from "./registry";

function App({ spec }) {
  return (
    <StateProvider initialState={{}}>
      <VisibilityProvider>
        <ActionProvider handlers={{}}>
          <ValidationProvider>
            <Renderer spec={spec} registry={registry} />
          </ValidationProvider>
        </ActionProvider>
      </VisibilityProvider>
    </StateProvider>
  );
}
```

## Standard Components

### Layout

| Component | Description |
|-----------|-------------|
| `Container` | Basic wrapper with padding, background, border radius |
| `Row` | Horizontal flex layout with gap, alignment, flex |
| `Column` | Vertical flex layout with gap, alignment, flex |
| `ScrollContainer` | Scrollable area (vertical or horizontal) |
| `SafeArea` | Safe area insets for notch/home indicator |
| `Pressable` | Touchable wrapper that triggers actions on press |
| `Spacer` | Fixed or flexible spacing between elements |
| `Divider` | Thin line separator |

### Content

| Component | Description |
|-----------|-------------|
| `Heading` | Heading text (levels 1-6) |
| `Paragraph` | Body text |
| `Label` | Small label text |
| `Image` | Image display with sizing modes |
| `Avatar` | Circular avatar image |
| `Badge` | Small status badge |
| `Chip` | Tag/chip for categories |

### Input

| Component | Description |
|-----------|-------------|
| `Button` | Pressable button with variants |
| `TextInput` | Text input field |
| `Switch` | Toggle switch |
| `Checkbox` | Checkbox with label |
| `Slider` | Range slider |
| `SearchBar` | Search input |

### Feedback

| Component | Description |
|-----------|-------------|
| `Spinner` | Loading indicator |
| `ProgressBar` | Progress indicator |

### Composite

| Component | Description |
|-----------|-------------|
| `Card` | Card container with optional header |
| `ListItem` | List row with title, subtitle, accessory |
| `Modal` | Bottom sheet modal |

## Visibility Conditions

Elements can use `visible` to show/hide based on state. Same syntax as [@json-render/react](../react/README.md#visibility-conditions): `{ "$state": "/path" }`, `{ "$state": "/path", "eq": value }`, `{ "$state": "/path", "not": true }`, or `[ cond1, cond2 ]` for AND.

## Pressable Component

The `Pressable` component wraps children and triggers an action on press. It's essential for building interactive UIs like tab bars:

```json
{
  "type": "Pressable",
  "props": {
    "action": "setState",
    "actionParams": { "statePath": "/activeTab", "value": "home" }
  },
  "children": ["home-tab-icon", "home-tab-label"]
}
```

## Built-in Actions

The `setState` action is handled automatically by `ActionProvider`. It updates the state model, which triggers re-evaluation of visibility conditions and dynamic prop expressions:

```json
{
  "action": "setState",
  "actionParams": { "statePath": "/activeTab", "value": "home" }
}
```

## Dynamic Prop Expressions

Any prop value can be a dynamic expression resolved at render time:

```json
{
  "type": "Icon",
  "props": {
    "name": {
      "$cond": { "$state": "/activeTab", "eq": "home" },
      "$then": "home",
      "$else": "home-outline"
    },
    "color": {
      "$cond": { "$state": "/activeTab", "eq": "home" },
      "$then": "#007AFF",
      "$else": "#8E8E93"
    }
  }
}
```

See [@json-render/core](../core/README.md) for full expression syntax.

## Tab Navigation Pattern

Combine `Pressable`, `setState`, visibility conditions, and dynamic props for functional tabs:

1. Each tab button is a `Pressable` with `action: "setState"` and `actionParams: { statePath: "/activeTab", value: "tabName" }`
2. Tab icons/labels use `$cond` dynamic props for active/inactive styling
3. Tab content sections use `visible` conditions: `{ "$state": "/activeTab", "eq": "tabName" }`

## AI Prompt Generation

```typescript
const systemPrompt = catalog.prompt({
  customRules: [
    "Use SafeArea as the root element",
    "Use Pressable + setState for interactive tabs",
  ],
});
```

## External Store (Controlled Mode)

For full control over state, pass a `StateStore` to bypass the internal state and wire json-render to any state management library (Redux, Zustand, XState, etc.):

```tsx
import { createStateStore, type StateStore } from "@json-render/react-native";

// Use the built-in store outside of React
const store = createStateStore({ count: 0 });

<StateProvider store={store}>
  {children}
</StateProvider>

// Mutate from anywhere — React will re-render automatically:
store.set("/count", 1);
```

When `store` is provided, `initialState` and `onStateChange` are ignored. The store is the single source of truth. The same `store` prop is available on `createRenderer`, `JSONUIProvider`, and `StateProvider`.

## Hooks

| Hook | Purpose |
|------|---------|
| `useStateStore()` | Access state context (`state`, `get`, `set`, `update`) |
| `useStateValue(path)` | Get single value from state |
| `useStateBinding(path)` | Two-way data binding (returns `[value, setValue]`) |
| `useVisibility()` | Access visibility evaluation |
| `useIsVisible(condition)` | Check if condition is met |
| `useActions()` | Access action context |
| `useAction(name)` | Get a single action dispatch function |
| `useUIStream(options)` | Stream specs from an API endpoint |
| `createStandardActionHandlers(options)` | Create handlers for standard actions |
| `createStateStore(initialState)` | Create a framework-agnostic in-memory `StateStore` |
