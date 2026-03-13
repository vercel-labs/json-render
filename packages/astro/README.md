# @json-render/astro

SSR renderer for `@json-render/core`. JSON becomes HTML on the server. Zero framework dependencies -- works in Astro, Cloudflare Workers, Node.js, Deno, Bun, or any server environment.

## Install

```bash
npm install @json-render/core @json-render/astro
```

## Quick Start

### Define a catalog and registry

```typescript
import { defineCatalog } from "@json-render/core";
import { schema, renderToHtml, escapeHtml } from "@json-render/astro";
import { z } from "zod";

const catalog = defineCatalog(schema, {
  components: {
    Section: {
      props: z.object({
        id: z.string().nullable(),
      }),
      description: "A content section",
    },
    Heading: {
      props: z.object({
        text: z.string(),
        level: z.enum(["h1", "h2", "h3"]).nullable(),
      }),
      description: "Heading text",
    },
    Text: {
      props: z.object({
        content: z.string(),
      }),
      description: "Body text paragraph",
    },
  },
});

// Registry: pure functions that return HTML strings
const registry = {
  Section: ({ props, children }) =>
    `<section${props.id ? ` id="${escapeHtml(props.id)}"` : ""}>${children}</section>`,
  Heading: ({ props }) =>
    `<${props.level || "h2"}>${escapeHtml(props.text)}</${props.level || "h2"}>`,
  Text: ({ props }) =>
    `<p>${escapeHtml(props.content)}</p>`,
};
```

### Render a spec to HTML

```typescript
import type { Spec } from "@json-render/core";

const spec: Spec = {
  root: "section-1",
  elements: {
    "section-1": {
      type: "Section",
      props: { id: "hero" },
      children: ["heading-1", "text-1"],
    },
    "heading-1": {
      type: "Heading",
      props: { text: "Welcome", level: "h1" },
      children: [],
    },
    "text-1": {
      type: "Text",
      props: { content: "Hello from the server." },
      children: [],
    },
  },
};

const html = renderToHtml(spec, { registry });
// => <section id="hero"><h1>Welcome</h1><p>Hello from the server.</p></section>
```

## Usage with Astro

In an Astro page or component, use `set:html` to inject the rendered HTML:

```astro
---
// src/pages/index.astro
import { renderToHtml } from "@json-render/astro";

const html = renderToHtml(spec, { registry, state: { showBanner: true } });
---

<html>
  <body>
    <div set:html={html} />
  </body>
</html>
```

## Usage with Cloudflare Workers

```typescript
import { renderToHtml, escapeHtml } from "@json-render/astro/render";

export default {
  async fetch(request: Request): Promise<Response> {
    const spec = await getSpecFromAI(request);

    const html = renderToHtml(spec, {
      registry: {
        Card: ({ props, children }) =>
          `<div class="card"><h3>${escapeHtml(props.title)}</h3>${children}</div>`,
        Text: ({ props }) =>
          `<p>${escapeHtml(props.content)}</p>`,
      },
      state: { theme: "dark" },
    });

    return new Response(`<!DOCTYPE html><html><body>${html}</body></html>`, {
      headers: { "Content-Type": "text/html" },
    });
  },
};
```

## Astro Islands Pattern

Use `@json-render/astro` for static content and framework-specific renderers (`@json-render/react`, `/vue`, `/svelte`, `/solid`) for interactive islands. This is the recommended architecture for Astro apps.

### React Island

```astro
---
// src/pages/index.astro
import { renderToHtml } from "@json-render/astro";
import Counter from "../components/Counter"; // React component

const staticHtml = renderToHtml(spec, { registry });
---

<!-- Static SSR content (zero JS sent to browser) -->
<div set:html={staticHtml} />

<!-- Interactive React island (hydrated client-side) -->
<Counter client:visible />
```

### Vue Island

```astro
---
import { renderToHtml } from "@json-render/astro";
import Dashboard from "../components/Dashboard.vue"; // Vue component

const staticHtml = renderToHtml(spec, { registry });
---

<div set:html={staticHtml} />
<Dashboard client:load />
```

### Svelte Island

```astro
---
import { renderToHtml } from "@json-render/astro";
import Form from "../components/Form.svelte"; // Svelte component

const staticHtml = renderToHtml(spec, { registry });
---

<div set:html={staticHtml} />
<Form client:visible />
```

### Solid Island

```astro
---
import { renderToHtml } from "@json-render/astro";
import Editor from "../components/Editor"; // Solid component

const staticHtml = renderToHtml(spec, { registry });
---

<div set:html={staticHtml} />
<Editor client:idle />
```

Each island component uses its own `@json-render/*` renderer internally (e.g., `defineRegistry` + `Renderer` from `@json-render/react`). The static sections rendered by `@json-render/astro` ship zero JavaScript to the browser.

See the [islands example](https://github.com/vercel-labs/json-render/tree/main/examples/astro/src/pages/islands.astro) for a full working implementation with React.

## API Reference

### `renderToHtml(spec, options)`

Render a json-render spec to an HTML string. Pure, synchronous, no framework dependencies.

**Parameters:**

- `spec` (`Spec`) -- the json-render spec to render
- `options.registry` (`ComponentRegistry`) -- component render functions
- `options.state` (`Record<string, unknown>`, optional) -- state for `$state`/`$cond` resolution

**Returns:** `string` -- the rendered HTML

### `escapeHtml(str)`

Escape HTML special characters to prevent XSS. Use in component render functions for any user-provided content.

### `schema`

The SSR element schema. Use with `defineCatalog` from core.

## Server-Safe Import

Import schema and catalog definitions without the renderer:

```typescript
import { schema, defineCatalog } from "@json-render/astro/server";
```

## Sub-path Exports

| Export | Description |
|--------|-------------|
| `@json-render/astro` | Full package: schema, renderer, types |
| `@json-render/astro/server` | Schema and catalog definitions only (no renderer) |
| `@json-render/astro/render` | Render functions and types only |

## Types

| Export | Description |
|--------|-------------|
| `AstroSchema` | Schema type for SSR specs |
| `AstroSpec` | Spec type for SSR output |
| `RenderOptions` | Options for `renderToHtml()` |
| `ComponentRenderProps` | Props passed to component render functions |
| `ComponentRenderer` | Component render function type |
| `ComponentRegistry` | Map of component names to render functions |
| `Components<C>` | Typed registry for a specific catalog |
| `ComponentFn<C, K>` | Typed render function for a specific component |

## Documentation

Full API reference: [json-render.dev/docs/api/astro](https://json-render.dev/docs/api/astro).

## License

Apache-2.0
