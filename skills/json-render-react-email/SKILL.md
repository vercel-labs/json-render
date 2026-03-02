---
name: json-render-react-email
description: React Email renderer for json-render that turns JSON specs into HTML or plain-text emails using @react-email/components and @react-email/render. Use when working with @json-render/react-email, building transactional or marketing emails from JSON, creating email catalogs, rendering AI-generated email specs, or when the user mentions react-email, HTML email, or transactional email.
metadata:
  tags: react-email, email, json-render, html email, transactional email
---

# @json-render/react-email

React Email renderer that converts JSON specs into HTML or plain-text email output.

## Quick Start

```typescript
import { renderToHtml } from "@json-render/react-email";
import { schema, standardComponentDefinitions } from "@json-render/react-email";
import { defineCatalog } from "@json-render/core";

const catalog = defineCatalog(schema, {
  components: standardComponentDefinitions,
});

const spec = {
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

## Spec Structure (Element Tree)

Same flat element tree as `@json-render/react`: `root` key plus `elements` map. Root must be `Html`; children of `Html` should be `Head` and `Body`. Use `Container` (e.g. max-width 600px) inside `Body` for client-safe layout.

## Creating a Catalog and Registry

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

## Server-Side Render APIs

| Function | Purpose |
|----------|---------|
| `renderToHtml(spec, options?)` | Render spec to HTML email string |
| `renderToPlainText(spec, options?)` | Render spec to plain-text email string |

`RenderOptions`: `registry`, `includeStandard` (default true), `state` (for `$state` / `$cond`).

## Visibility and State

Supports `visible` conditions, `$state`, `$cond`, repeat (`repeat.statePath`), and the same expression syntax as `@json-render/react`. Use `state` in `RenderOptions` when rendering server-side so expressions resolve.

## Server-Safe Import

Import schema and catalog without React or `@react-email/components`:

```typescript
import { schema, standardComponentDefinitions } from "@json-render/react-email/server";
```

## Key Exports

| Export | Purpose |
|--------|---------|
| `defineRegistry` | Create type-safe component registry from catalog |
| `Renderer` | Render spec in browser (e.g. preview); use with `JSONUIProvider` for state/actions |
| `createRenderer` | Standalone renderer component with state/actions/validation |
| `renderToHtml` | Server: spec to HTML string |
| `renderToPlainText` | Server: spec to plain-text string |
| `schema` | Email element schema |
| `standardComponents` | Pre-built component implementations |
| `standardComponentDefinitions` | Catalog definitions (Zod props) |

## Sub-path Exports

| Path | Purpose |
|------|---------|
| `@json-render/react-email` | Full package |
| `@json-render/react-email/server` | Schema and catalog only (no React) |
| `@json-render/react-email/catalog` | Standard component definitions and types |
| `@json-render/react-email/render` | Render functions only |

## Standard Components

All components accept a `style` prop (object) for inline styles. Use inline styles for email client compatibility; avoid external CSS.

### Document structure

| Component | Description |
|-----------|-------------|
| `Html` | Root wrapper (lang, dir). Children: Head, Body. |
| `Head` | Email head section. |
| `Body` | Body wrapper; use `style` for background. |

### Layout

| Component | Description |
|-----------|-------------|
| `Container` | Constrain width (e.g. max-width 600px). |
| `Section` | Group content; table-based for compatibility. |
| `Row` | Horizontal row. |
| `Column` | Column in a Row; set width via style. |

### Content

| Component | Description |
|-----------|-------------|
| `Heading` | Heading text (as: h1–h6). |
| `Text` | Body text. |
| `Link` | Hyperlink (text, href). |
| `Button` | CTA link styled as button (text, href). |
| `Image` | Image from URL (src, alt, width, height). |
| `Hr` | Horizontal rule. |

### Utility

| Component | Description |
|-----------|-------------|
| `Preview` | Inbox preview text (inside Html). |
| `Markdown` | Markdown content as email-safe HTML. |

## Email Best Practices

- Keep width constrained (e.g. Container max-width 600px).
- Use inline styles or React Email's style props; many clients strip `<style>` blocks.
- Prefer table-based layout (Section, Row, Column) for broad client support.
- Use absolute URLs for images; many clients block relative or cid: references in some contexts.
- Test in multiple clients (Gmail, Outlook, Apple Mail); use a preview tool or Litmus-like service when possible.
