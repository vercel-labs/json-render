# @json-render/ink

Ink terminal renderer for json-render. Turn JSON specs into interactive terminal UIs.

## Installation

```bash
npm install @json-render/ink @json-render/core ink react
```

Peer dependencies: `ink ^6.0.0` and `react ^19.0.0`.

## Quick Start

### 1. Create a Catalog

```typescript
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/ink/schema";
import {
  standardComponentDefinitions,
  standardActionDefinitions,
} from "@json-render/ink/catalog";

export const catalog = defineCatalog(schema, {
  components: standardComponentDefinitions,
  actions: standardActionDefinitions,
});
```

### 2. Render a Spec

```tsx
import { render } from "ink";
import { createRenderer, standardComponents } from "@json-render/ink";
import { catalog } from "./catalog";

const InkRenderer = createRenderer(catalog, standardComponents);

const spec = {
  root: "heading",
  elements: {
    heading: {
      type: "Heading",
      props: { text: "Hello from the terminal!", level: "h1" },
      children: [],
    },
  },
};

render(<InkRenderer spec={spec} state={{}} />);
```

## Standard Components

### Layout

| Component | Description |
|-----------|-------------|
| `Box` | Flexbox layout container (like a terminal `<div>`) |
| `Text` | Text output with optional styling (color, bold, italic, etc.) |
| `Newline` | Inserts one or more blank lines |
| `Spacer` | Flexible empty space that expands to fill available room |

### Content

| Component | Description |
|-----------|-------------|
| `Heading` | Section heading (h1–h4) |
| `Divider` | Horizontal separator line with optional title |
| `Badge` | Small colored inline label for status |
| `Spinner` | Animated loading spinner with optional label |
| `ProgressBar` | Horizontal progress bar (0–1) |
| `Sparkline` | Inline sparkline chart using Unicode blocks |
| `BarChart` | Horizontal bar chart with labels and values |
| `Table` | Tabular data display with headers and rows |
| `List` | Bulleted or numbered list |
| `ListItem` | Structured list row with title, subtitle, leading/trailing |
| `Card` | Bordered container with optional title |
| `KeyValue` | Key-value pair display |
| `Link` | Clickable URL |
| `StatusLine` | Status message with colored icon |
| `Markdown` | Renders markdown-formatted text with terminal styling |

### Interactive

| Component | Description |
|-----------|-------------|
| `TextInput` | Text input field with two-way binding |
| `Select` | Selection menu navigated with arrow keys |
| `MultiSelect` | Multi-selection with space to toggle, enter to confirm |
| `ConfirmInput` | Yes/No confirmation prompt |
| `Tabs` | Tab bar navigation with left/right arrow keys |

## Generate AI Prompts

```typescript
const systemPrompt = catalog.prompt({ system: "You are a terminal assistant." });
```

## Streaming

Use `useUIStream` to progressively render specs from JSONL patch streams:

```tsx
import { useUIStream } from "@json-render/ink";

const { spec, send, isStreaming } = useUIStream({ api: "/api/generate" });
```

## Key Exports

| Export | Purpose |
|--------|---------|
| `createRenderer` | Create an all-in-one renderer component from a catalog |
| `Renderer` | Low-level spec renderer |
| `JSONUIProvider` | Combined provider (state, visibility, validation, actions, focus) |
| `standardComponents` | Pre-built component implementations for all standard components |
| `schema` | Ink element tree schema |
| `useStateStore` | Access state context (`state`, `get`, `set`, `update`) |
| `useStateValue` | Get single value from state |
| `useBoundProp` | Two-way binding for `$bindState`/`$bindItem` expressions |
| `useUIStream` | Stream specs from an API endpoint |
| `createStateStore` | Create a framework-agnostic in-memory `StateStore` |

### Catalog Entry Points

| Entry Point | Exports |
|-------------|---------|
| `@json-render/ink` | Components, renderer, hooks, providers |
| `@json-render/ink/schema` | `schema`, `InkSchema`, `InkSpec` |
| `@json-render/ink/catalog` | `standardComponentDefinitions`, `standardActionDefinitions` |
| `@json-render/ink/server` | Server-safe re-exports (schema + catalog, no React dependency) |

## Documentation

- [API Reference](https://json-render.dev/docs/api/ink)
- [Renderers Overview](https://json-render.dev/docs/renderers)
- [Ink Chat Example](https://github.com/vercel-labs/json-render/tree/main/examples/ink-chat)
