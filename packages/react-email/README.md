# @json-render/react-email

React Email renderer for `@json-render/core`. Generate HTML and plain-text emails from JSON specs using `@react-email/components` and `@react-email/render`.

## Install

```bash
npm install @json-render/core @json-render/react-email @react-email/components @react-email/render
```

## Quick Start

### Render a spec to HTML

```typescript
import { renderToHtml } from "@json-render/react-email";
import type { Spec } from "@json-render/core";

const spec: Spec = {
  root: "html-1",
  elements: {
    "html-1": { type: "Html", props: { lang: "en", dir: "ltr" }, children: ["head-1", "body-1"] },
    "head-1": { type: "Head", props: {}, children: [] },
    "body-1": {
      type: "Body",
      props: { style: { backgroundColor: "#f6f9fc" } },
      children: ["container-1"],
    },
    "container-1": {
      type: "Container",
      props: { style: { maxWidth: "600px", margin: "0 auto", padding: "20px" } },
      children: ["heading-1", "text-1"],
    },
    "heading-1": { type: "Heading", props: { text: "Welcome" }, children: [] },
    "text-1": { type: "Text", props: { text: "Thanks for signing up." }, children: [] },
  },
};

const html = await renderToHtml(spec);
```

### With a custom catalog

```typescript
import { defineCatalog } from "@json-render/core";
import { schema, defineRegistry, renderToHtml } from "@json-render/react-email";
import { standardComponentDefinitions } from "@json-render/react-email/catalog";
import { Container, Heading, Text } from "@react-email/components";
import { z } from "zod";

const catalog = defineCatalog(schema, {
  components: {
    ...standardComponentDefinitions,
    Alert: {
      props: z.object({
        message: z.string(),
        variant: z.enum(["info", "success", "warning"]).nullable(),
      }),
      slots: [],
      description: "A highlighted message block",
    },
  },
  actions: {},
});

const { registry } = defineRegistry(catalog, {
  components: {
    Alert: ({ props }) => (
      <Container style={{ padding: 16, backgroundColor: "#eff6ff", borderRadius: 8 }}>
        <Text style={{ margin: 0 }}>{props.message}</Text>
      </Container>
    ),
  },
});

const html = await renderToHtml(spec, { registry });
```

## Standard Components

### Document structure

| Component | Description |
|-----------|-------------|
| `Html` | Top-level email wrapper. Must be the root element. |
| `Head` | Email head section. |
| `Body` | Email body wrapper. |

### Layout

| Component | Description |
|-----------|-------------|
| `Container` | Constrains content width. |
| `Section` | Groups related content. |
| `Row` | Horizontal layout row. |
| `Column` | Column within a Row. |

### Content

| Component | Description |
|-----------|-------------|
| `Heading` | Heading text (h1–h6). |
| `Text` | Body text paragraph. |
| `Link` | Hyperlink. |
| `Button` | Call-to-action button. |
| `Image` | Image from URL. |
| `Hr` | Horizontal rule. |

### Utility

| Component | Description |
|-----------|-------------|
| `Preview` | Inbox preview text. |
| `Markdown` | Markdown content as email-safe HTML. |

## Server-Side APIs

```typescript
import { renderToHtml, renderToPlainText } from "@json-render/react-email";

const html = await renderToHtml(spec);
const plainText = await renderToPlainText(spec);
```

Both accept an optional second argument with:

- `registry` — Custom component registry (merged with standard components)
- `includeStandard` — Include built-in standard components (default: `true`)
- `state` — Initial state for `$state` / `$cond` dynamic prop resolution

## Server-Safe Import

Import schema and catalog definitions without pulling in React or `@react-email/components`:

```typescript
import { schema, standardComponentDefinitions } from "@json-render/react-email/server";
```

## Documentation

Full API reference: [json-render.dev/docs/api/react-email](https://json-render.dev/docs/api/react-email).

Example app: [examples/react-email](https://github.com/vercel-labs/json-render/tree/main/examples/react-email).

## License

Apache-2.0
