---
name: astro
description: SSR HTML renderer for json-render that turns JSON specs into HTML strings on the server. Use when working with @json-render/astro, building server-rendered HTML from JSON, rendering specs in Astro SSR, Cloudflare Workers, Deno, Bun, or any server environment, or when the user mentions SSR HTML rendering, edge rendering, or server-side JSON-to-HTML.
metadata:
  tags: astro, ssr, html, json-render, cloudflare-workers, edge, server-rendering
---

# @json-render/astro

SSR renderer that converts JSON specs into HTML strings on the server. Zero framework dependencies.

## Quick Start

```typescript
import { renderToHtml, escapeHtml } from "@json-render/astro";
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/astro";
import { z } from "zod";

const catalog = defineCatalog(schema, {
  components: {
    Card: {
      props: z.object({ title: z.string() }),
      description: "A card container",
    },
    Text: {
      props: z.object({ content: z.string() }),
      description: "Body text paragraph",
    },
  },
});

const registry = {
  Card: ({ props, children }) =>
    `<div class="card"><h3>${escapeHtml(props.title)}</h3>${children}</div>`,
  Text: ({ props }) =>
    `<p>${escapeHtml(props.content)}</p>`,
};

const html = renderToHtml(spec, { registry, state: { theme: "dark" } });
```

## Spec Structure (Element Tree)

Same flat element tree as other json-render renderers: `root` key plus `elements` map. Each element has `type`, `props`, `children`, and optional `visible` and `repeat`.

## Creating a Registry

The registry is a plain object mapping component type names to render functions. Each function receives `{ props, children }` and returns an HTML string.

```typescript
import type { ComponentRegistry } from "@json-render/astro";

const registry: ComponentRegistry = {
  Section: ({ props, children }) =>
    `<section id="${escapeHtml(props.id)}">${children}</section>`,
  Heading: ({ props }) =>
    `<${props.level || "h2"}>${escapeHtml(props.text)}</${props.level || "h2"}>`,
};
```

Always use `escapeHtml()` for user-provided content to prevent XSS.

## Server-Side Render API

| Function | Purpose |
|----------|---------|
| `renderToHtml(spec, options)` | Render spec to HTML string (synchronous) |
| `escapeHtml(str)` | Escape HTML special characters |

`RenderOptions`: `registry` (required), `state` (optional, for `$state` / `$cond`).

## Visibility and State

Supports `visible` conditions, `$state`, `$cond`, `$item`, `$index`, `$template`, and `repeat` (same expression syntax as other renderers). Pass `state` in `RenderOptions` so expressions resolve at render time.

## Usage with Astro

```astro
---
import { renderToHtml } from "@json-render/astro";
const html = renderToHtml(spec, { registry });
---
<div set:html={html} />
```

## Usage with Cloudflare Workers

```typescript
import { renderToHtml } from "@json-render/astro/render";

export default {
  async fetch(request) {
    const spec = await getSpec(request);
    const html = renderToHtml(spec, { registry });
    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  },
};
```

## Server-Safe Import

Import schema and catalog without the renderer:

```typescript
import { schema, defineCatalog } from "@json-render/astro/server";
```

## Key Exports

| Export | Purpose |
|--------|---------|
| `renderToHtml` | Spec to HTML string (synchronous) |
| `escapeHtml` | Escape HTML special characters |
| `schema` | SSR element schema |
| `defineCatalog` | Re-export from core |

## Sub-path Exports

| Path | Purpose |
|------|---------|
| `@json-render/astro` | Full package |
| `@json-render/astro/server` | Schema and catalog only (no renderer) |
| `@json-render/astro/render` | Render functions only |

## Astro Islands Pattern

Use `@json-render/astro` for static content and framework renderers for interactive islands:

```astro
---
import { renderToHtml } from "@json-render/astro";
import Counter from "../components/Counter"; // React, Vue, Svelte, or Solid

const staticHtml = renderToHtml(spec, { registry });
---

<!-- Static SSR (zero JS) -->
<div set:html={staticHtml} />

<!-- Interactive island (hydrated client-side) -->
<Counter client:visible />
```

Supported island frameworks: React (`@json-render/react`), Vue (`@json-render/vue`), Svelte (`@json-render/svelte`), Solid (`@json-render/solid`). Each island uses its own renderer internally. Static sections ship no JavaScript.

## Key Differences from Other Renderers

- **No framework dependency**: produces raw HTML strings, not React elements or Vue VNodes
- **Synchronous**: `renderToHtml()` is synchronous (no `await` needed), unlike `@json-render/react-email`
- **No actions/state mutations**: SSR-only, no interactive event handlers
- **Registry pattern**: functions return strings, not JSX/components
- **XSS prevention**: use `escapeHtml()` explicitly in render functions
