# @json-render/antd

Pre-built [Ant Design](https://ant.design/) components for json-render. Drop-in catalog definitions and React implementations for 50+ components built on Ant Design.

## Installation

```bash
npm install @json-render/antd @json-render/core @json-render/react antd zod
```

## Quick Start

### 1. Create a Catalog

Import standard definitions from `@json-render/antd/catalog` and pass them to `defineCatalog`:

```typescript
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { antdComponentDefinitions } from "@json-render/antd/catalog";

const catalog = defineCatalog(schema, {
  components: {
    // Pick the components you need
    Card: antdComponentDefinitions.Card,
    Stack: antdComponentDefinitions.Stack,
    Heading: antdComponentDefinitions.Heading,
    Button: antdComponentDefinitions.Button,
    Input: antdComponentDefinitions.Input,
  },
  actions: {},
});
```

> **Note:** State actions (`setState`, `pushState`, `removeState`) are built into the React schema and handled automatically by `ActionProvider`. You don't need to declare them in your catalog.

### 2. Create a Registry

Import standard implementations from `@json-render/antd` and pass them to `defineRegistry`:

```typescript
import { defineRegistry } from "@json-render/react";
import { antdComponents } from "@json-render/antd";

const { registry } = defineRegistry(catalog, {
  components: {
    Card: antdComponents.Card,
    Stack: antdComponents.Stack,
    Heading: antdComponents.Heading,
    Button: antdComponents.Button,
    Input: antdComponents.Input,
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
    Card: antdComponentDefinitions.Card,
    Stack: antdComponentDefinitions.Stack,
    Button: antdComponentDefinitions.Button,

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
    Card: antdComponents.Card,
    Stack: antdComponents.Stack,
    Button: antdComponents.Button,

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
| `Grid` | Grid layout |
| `Divider` | Visual separator line |
| `Space` | Spacing component |

### Navigation

| Component | Description |
|-----------|-------------|
| `Tabs` | Tabbed navigation |
| `Collapse` | Collapsible accordion sections |
| `Menu` | Navigation menu |

### Overlay

| Component | Description |
|-----------|-------------|
| `Modal` | Modal dialog |
| `Drawer` | Drawer panel |
| `Popover` | Click-triggered popover |
| `Tooltip` | Hover tooltip |
| `Dropdown` | Dropdown menu |

### Content

| Component | Description |
|-----------|-------------|
| `Table` | Data table with columns and rows |
| `Heading` | Heading text |
| `Text` | Text content |
| `Paragraph` | Paragraph text |
| `Image` | Image display |
| `Avatar` | User avatar with fallback |
| `Badge` | Status badge |
| `Tag` | Tag component |
| `Alert` | Alert banner |
| `Progress` | Progress bar |
| `Skeleton` | Loading placeholder |
| `Spin` | Loading spinner |
| `Empty` | Empty state |
| `Statistic` | Statistic display |
| `Descriptions` | Description list |
| `Timeline` | Timeline display |
| `Carousel` | Horizontally scrollable carousel |

### Input

| Component | Description |
|-----------|-------------|
| `Input` | Text input with label, validation, and `validateOn` timing |
| `TextArea` | Multi-line text input with validation |
| `InputNumber` | Number input |
| `Select` | Dropdown select with validation |
| `Checkbox` | Checkbox input with validation |
| `CheckboxGroup` | Group of checkboxes |
| `Radio` | Radio button group with validation |
| `Switch` | Toggle switch with validation |
| `Slider` | Range slider |
| `Rate` | Star rating |
| `DatePicker` | Date picker |
| `TimePicker` | Time picker |
| `Upload` | File upload |
| `Transfer` | Transfer shuttle |

### Action

| Component | Description |
|-----------|-------------|
| `Button` | Clickable button with variants |
| `Link` | Anchor link |
| `ButtonGroup` | Group of buttons |
| `Pagination` | Page navigation |
| `Segmented` | Segmented control |
| `Steps` | Steps component |
| `Result` | Result page |

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
| `@json-render/antd` | `antdComponents` |
| `@json-render/antd/catalog` | `antdComponentDefinitions` |

The `/catalog` entry point contains only Zod schemas (no React dependency), so it can be used in server-side code for prompt generation.
