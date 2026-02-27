# @json-render/react-pdf

React PDF renderer for `@json-render/core`. Generate PDF documents from JSON specs using `@react-pdf/renderer`.

## Install

```bash
npm install @json-render/core @json-render/react-pdf
```

## Quick Start

### Render a spec to a PDF buffer

```typescript
import { renderToBuffer } from "@json-render/react-pdf";
import type { Spec } from "@json-render/core";

const spec: Spec = {
  root: "doc",
  elements: {
    doc: { type: "Document", props: { title: "Invoice" }, children: ["page"] },
    page: {
      type: "Page",
      props: { size: "A4" },
      children: ["heading", "table"],
    },
    heading: {
      type: "Heading",
      props: { text: "Invoice #1234", level: "h1" },
      children: [],
    },
    table: {
      type: "Table",
      props: {
        columns: [
          { header: "Item", width: "60%" },
          { header: "Price", width: "40%", align: "right" },
        ],
        rows: [
          ["Widget A", "$10.00"],
          ["Widget B", "$25.00"],
        ],
      },
      children: [],
    },
  },
};

const buffer = await renderToBuffer(spec);
```

### With a custom catalog

```typescript
import { defineCatalog } from "@json-render/core";
import { schema, defineRegistry, renderToBuffer } from "@json-render/react-pdf";
import { standardComponentDefinitions } from "@json-render/react-pdf/catalog";
import { z } from "zod";

const catalog = defineCatalog(schema, {
  components: {
    ...standardComponentDefinitions,
    Badge: {
      props: z.object({
        label: z.string(),
        color: z.string().nullable(),
      }),
      slots: [],
      description: "A colored badge label",
    },
  },
  actions: {},
});

const { registry } = defineRegistry(catalog, {
  components: {
    Badge: ({ props }) => (
      <View style={{ backgroundColor: props.color ?? "#e5e7eb", padding: 4, borderRadius: 4 }}>
        <Text style={{ fontSize: 10 }}>{props.label}</Text>
      </View>
    ),
  },
});

const buffer = await renderToBuffer(spec, { registry });
```

## Standard Components

### Document Structure

| Component | Description |
|-----------|-------------|
| `Document` | Top-level PDF wrapper. Must be the root element. |
| `Page` | A page with size (A4, LETTER, etc.), orientation, and margins. |

### Layout

| Component | Description |
|-----------|-------------|
| `View` | Generic container with padding, margin, background, border. |
| `Row` | Horizontal flex layout with gap, align, justify. |
| `Column` | Vertical flex layout with gap, align, justify. |

### Content

| Component | Description |
|-----------|-------------|
| `Heading` | h1-h4 heading text. |
| `Text` | Body text with fontSize, color, weight, alignment. |
| `Image` | Image from URL or base64. |
| `Link` | Hyperlink with text and href. |

### Data

| Component | Description |
|-----------|-------------|
| `Table` | Data table with typed columns and string rows. |
| `List` | Ordered or unordered list. |

### Decorative

| Component | Description |
|-----------|-------------|
| `Divider` | Horizontal line separator. |
| `Spacer` | Empty vertical space. |

### Page-Level

| Component | Description |
|-----------|-------------|
| `PageNumber` | Renders current page number and total pages. |

## Server-Side APIs

```typescript
import { renderToBuffer, renderToStream, renderToFile } from "@json-render/react-pdf";

// Render to an in-memory Buffer
const buffer = await renderToBuffer(spec);

// Render to a readable stream (pipe to HTTP response)
const stream = await renderToStream(spec);
stream.pipe(res);

// Render directly to a file
await renderToFile(spec, "./output.pdf");
```

All render functions accept an optional second argument with:

- `registry` - Custom component registry (merged with standard components)
- `state` - Initial state for `$state` / `$cond` dynamic prop resolution
- `handlers` - Action handlers

## External Store (Controlled Mode)

For full control over state, pass a `StateStore` to `StateProvider`, `JSONUIProvider`, or `createRenderer`. When `store` is provided, `initialState` and `onStateChange` are ignored and the store is the single source of truth:

```tsx
import { createStateStore, type StateStore } from "@json-render/react-pdf";

const store = createStateStore({ invoice: { total: 100 } });

// Mutate from anywhere — components re-render automatically:
store.set("/invoice/total", 200);
```

## Server-Safe Import

Import schema and catalog definitions without pulling in React:

```typescript
import { schema, standardComponentDefinitions } from "@json-render/react-pdf/server";
```

## License

Apache-2.0
