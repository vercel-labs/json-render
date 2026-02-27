# @json-render/shadcn

Pre-built [shadcn/ui](https://ui.shadcn.com/) components for json-render. Drop-in catalog definitions and React implementations for 36 components built on Radix UI + Tailwind CSS.

## Installation

```bash
npm install @json-render/shadcn @json-render/core @json-render/react zod
```

## Quick Start

### 1. Create a Catalog

Import standard definitions from `@json-render/shadcn/catalog` and pass them to `defineCatalog`:

```typescript
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog";

const catalog = defineCatalog(schema, {
  components: {
    // Pick the components you need
    Card: shadcnComponentDefinitions.Card,
    Stack: shadcnComponentDefinitions.Stack,
    Heading: shadcnComponentDefinitions.Heading,
    Button: shadcnComponentDefinitions.Button,
    Input: shadcnComponentDefinitions.Input,
  },
  actions: {},
});
```

> **Note:** State actions (`setState`, `pushState`, `removeState`) are built into the React schema and handled automatically by `ActionProvider`. You don't need to declare them in your catalog.

### 2. Create a Registry

Import standard implementations from `@json-render/shadcn` and pass them to `defineRegistry`:

```typescript
import { defineRegistry } from "@json-render/react";
import { shadcnComponents } from "@json-render/shadcn";

const { registry } = defineRegistry(catalog, {
  components: {
    Card: shadcnComponents.Card,
    Stack: shadcnComponents.Stack,
    Heading: shadcnComponents.Heading,
    Button: shadcnComponents.Button,
    Input: shadcnComponents.Input,
  },
});
```

### 3. Render

```tsx
import { Renderer } from "@json-render/react";

function App({ spec }) {
  return <Renderer spec={spec} registry={registry} />;
}
```

## Extending with Custom Components

Pick standard components as a base and add your own alongside them:

```typescript
import { z } from "zod";

// Catalog
const catalog = defineCatalog(schema, {
  components: {
    // Standard
    Card: shadcnComponentDefinitions.Card,
    Stack: shadcnComponentDefinitions.Stack,
    Button: shadcnComponentDefinitions.Button,

    // Custom
    Metric: {
      props: z.object({
        label: z.string(),
        value: z.string(),
        trend: z.enum(["up", "down", "neutral"]).nullable(),
      }),
      description: "KPI metric display",
    },
  },
  actions: {},
});

// Registry
const { registry } = defineRegistry(catalog, {
  components: {
    // Standard
    Card: shadcnComponents.Card,
    Stack: shadcnComponents.Stack,
    Button: shadcnComponents.Button,

    // Custom
    Metric: ({ props }) => (
      <div>
        <span>{props.label}</span>
        <span>{props.value}</span>
      </div>
    ),
  },
});
```

## Standard Components

### Layout

| Component | Description |
|-----------|-------------|
| `Card` | Container card with optional title and description |
| `Stack` | Flex container (horizontal/vertical) with gap, alignment, justify |
| `Grid` | Grid layout (1-6 columns) |
| `Separator` | Visual separator line |

### Navigation

| Component | Description |
|-----------|-------------|
| `Tabs` | Tabbed navigation |
| `Accordion` | Collapsible accordion sections |
| `Collapsible` | Single collapsible section with trigger |
| `Pagination` | Page navigation |

### Overlay

| Component | Description |
|-----------|-------------|
| `Dialog` | Modal dialog |
| `Drawer` | Bottom drawer |
| `Tooltip` | Hover tooltip |
| `Popover` | Click-triggered popover |
| `DropdownMenu` | Dropdown menu with selectable items |

### Content

| Component | Description |
|-----------|-------------|
| `Heading` | Heading text (h1-h4) |
| `Text` | Paragraph text with variants (body, caption, muted, lead, code) |
| `Image` | Placeholder image |
| `Avatar` | User avatar with fallback initials |
| `Badge` | Status badge |
| `Alert` | Alert banner |
| `Carousel` | Horizontally scrollable carousel |
| `Table` | Data table with columns and rows |

### Feedback

| Component | Description |
|-----------|-------------|
| `Progress` | Progress bar |
| `Skeleton` | Loading placeholder |
| `Spinner` | Loading spinner |

### Input

| Component | Description |
|-----------|-------------|
| `Button` | Clickable button with variants |
| `Link` | Anchor link |
| `Input` | Text input with label, validation, and `validateOn` timing |
| `Textarea` | Multi-line text input with validation and `validateOn` |
| `Select` | Dropdown select with validation and `validateOn` |
| `Checkbox` | Checkbox input with validation and `validateOn` |
| `Radio` | Radio button group with validation and `validateOn` |
| `Switch` | Toggle switch with validation and `validateOn` |
| `Slider` | Range slider |
| `Toggle` | Toggle button |
| `ToggleGroup` | Group of toggle buttons |
| `ButtonGroup` | Group of buttons with selected state |

## Built-in Actions

State actions (`setState`, `pushState`, `removeState`, `validateForm`) are built into the `@json-render/react` schema and handled automatically by `ActionProvider`. They are included in prompts without needing to be declared in your catalog.

| Action | Description |
|--------|-------------|
| `setState` | Set a value at a state path |
| `pushState` | Push a value onto an array in state |
| `removeState` | Remove an item from an array in state |
| `validateForm` | Validate all fields and write result to state |

### Validation Timing (`validateOn`)

All form components support the `validateOn` prop to control when validation runs:

| Value | Description | Default For |
|-------|-------------|-------------|
| `"change"` | Validate on every input change | Select, Checkbox, Radio, Switch |
| `"blur"` | Validate when field loses focus | Input, Textarea |
| `"submit"` | Validate only on form submission | — |

## Exports

| Entry Point | Exports |
|-------------|---------|
| `@json-render/shadcn` | `shadcnComponents` |
| `@json-render/shadcn/catalog` | `shadcnComponentDefinitions` |

The `/catalog` entry point contains only Zod schemas (no React dependency), so it can be used in server-side code for prompt generation.
