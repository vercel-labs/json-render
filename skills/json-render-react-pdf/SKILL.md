---
name: json-render-react-pdf
description: React PDF renderer for json-render. Use when generating PDF documents from JSON specs, working with @json-render/react-pdf, or rendering specs to PDF buffers/streams/files.
---

# @json-render/react-pdf

React PDF renderer that generates PDF documents from JSON specs using `@react-pdf/renderer`.

## Installation

```bash
npm install @json-render/core @json-render/react-pdf
```

## Quick Start

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

## Render APIs

```typescript
import { renderToBuffer, renderToStream, renderToFile } from "@json-render/react-pdf";

// In-memory buffer
const buffer = await renderToBuffer(spec);

// Readable stream (pipe to HTTP response)
const stream = await renderToStream(spec);
stream.pipe(res);

// Direct to file
await renderToFile(spec, "./output.pdf");
```

All render functions accept an optional second argument: `{ registry?, state?, handlers? }`.

## Standard Components

| Component | Description |
|-----------|-------------|
| `Document` | Top-level PDF wrapper (must be root) |
| `Page` | Page with size (A4, LETTER), orientation, margins |
| `View` | Generic container (padding, margin, background, border) |
| `Row`, `Column` | Flex layout with gap, align, justify |
| `Heading` | h1-h4 heading text |
| `Text` | Body text (fontSize, color, weight, alignment) |
| `Image` | Image from URL or base64 |
| `Link` | Hyperlink with text and href |
| `Table` | Data table with typed columns and rows |
| `List` | Ordered or unordered list |
| `Divider` | Horizontal line separator |
| `Spacer` | Empty vertical space |
| `PageNumber` | Current page number and total pages |

## Custom Catalog

```typescript
import { defineCatalog } from "@json-render/core";
import { schema, defineRegistry, renderToBuffer } from "@json-render/react-pdf";
import { standardComponentDefinitions } from "@json-render/react-pdf/catalog";
import { z } from "zod";

const catalog = defineCatalog(schema, {
  components: {
    ...standardComponentDefinitions,
    Badge: {
      props: z.object({ label: z.string(), color: z.string().nullable() }),
      slots: [],
      description: "A colored badge label",
    },
  },
  actions: {},
});

const { registry } = defineRegistry(catalog, {
  components: {
    Badge: ({ props }) => (
      <View style={{ backgroundColor: props.color ?? "#e5e7eb", padding: 4 }}>
        <Text>{props.label}</Text>
      </View>
    ),
  },
});

const buffer = await renderToBuffer(spec, { registry });
```

## External Store (Controlled Mode)

Pass a `StateStore` for full control over state:

```typescript
import { createStateStore } from "@json-render/react-pdf";

const store = createStateStore({ invoice: { total: 100 } });
store.set("/invoice/total", 200);
```

## Server-Safe Import

Import schema and catalog without pulling in React:

```typescript
import { schema, standardComponentDefinitions } from "@json-render/react-pdf/server";
```
