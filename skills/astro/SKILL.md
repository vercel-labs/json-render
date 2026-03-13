---
name: astro
description: Astro renderer for @json-render/core. Use when working with @json-render/astro, defineRegistry for Astro, rendering JSON specs in Astro pages, using Astro Islands with json-render, or when the user mentions Astro rendering.
metadata:
  tags: astro, ssr, ssg, html, json-render, islands
---

# @json-render/astro

Astro renderer that converts json-render specs into Astro component trees. Static HTML output (zero JS).

## Quick Start

```astro
---
import Renderer from "@json-render/astro/Renderer.astro";
import { defineRegistry } from "@json-render/astro";
import { catalog } from "../lib/catalog";
import Card from "../components/Card.astro";
import Text from "../components/Text.astro";

const { registry } = defineRegistry(catalog, {
  components: { Card, Text },
});

const spec = await getSpec(); // from DB, CMS, AI, etc.
---

<Renderer spec={spec} registry={registry} state={{ showBanner: true }} />
```

## Creating a Catalog

```ts
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/astro";
import { z } from "zod";

export const catalog = defineCatalog(schema, {
  components: {
    Card: {
      props: z.object({
        title: z.string(),
        subtitle: z.string().optional(),
      }),
      description: "A card container",
    },
    Text: {
      props: z.object({ content: z.string() }),
      description: "A text block",
    },
  },
});
```

## Defining Components

Astro components receive resolved props via `Astro.props` and render children via `<slot />`:

```astro
---
// Card.astro
interface Props { title: string; subtitle?: string; }
const { title, subtitle } = Astro.props;
---

<article class="card">
  <h3>{title}</h3>
  {subtitle && <p>{subtitle}</p>}
  <slot />
</article>
```

All dynamic expressions (`$state`, `$cond`, `$item`, `$index`, `$template`) are resolved before props reach the component. Astro auto-escapes expressions, so no manual XSS protection is needed.

## Spec Structure (Element Tree)

Same flat element tree as other json-render renderers:

```json
{
  "root": "card-1",
  "elements": {
    "card-1": {
      "type": "Card",
      "props": { "title": "Welcome" },
      "children": ["text-1"]
    },
    "text-1": {
      "type": "Text",
      "props": { "content": "Hello from Astro!" },
      "children": []
    }
  }
}
```

Each element has `type`, `props`, `children`, and optional `visible` and `repeat`.

## Visibility Conditions

Use `visible` on elements to show/hide based on state:

- `{ "$state": "/path" }` - truthy check
- `{ "$state": "/path", "eq": value }` - equality check
- `{ "$state": "/path", "not": true }` - falsy check
- `{ "$and": [cond1, cond2] }` - AND conditions
- `{ "$or": [cond1, cond2] }` - OR conditions

## Dynamic Prop Expressions

Expression forms resolved before your component receives props:

- `{ "$state": "/state/key" }` - reads from state model
- `{ "$cond": <condition>, "$then": <value>, "$else": <value> }` - conditional value
- `{ "$template": "Hello, ${/name}!" }` - interpolates state values into strings
- `{ "$item": "field" }` - reads from current repeat item
- `{ "$index": true }` - current repeat index

No two-way binding (`$bindState`, `$bindItem`) since Astro is static HTML. For interactive form components, use an Astro island with a framework renderer.

## Renderer Props

- `spec` (`Spec`) - the json-render spec to render (required)
- `registry` (`AstroComponentRegistry`) - component registry from `defineRegistry()`
- `state` (`Record<string, unknown>`, optional) - state for `$state`/`$cond` resolution (merged with `spec.state`)
- `loading` (`boolean`, optional) - suppresses missing component warnings during streaming
- `fallback` (`AstroComponentFactory`, optional) - rendered for unknown component types

## SSG vs SSR

Works in both modes without modification:
- **SSG** (default, no adapter): state resolved at build time
- **SSR** (with adapter): state resolved at each request

The choice is a project-level Astro decision, not a package concern.

## Astro Islands Pattern

Use `@json-render/astro` for static content and framework renderers for interactive islands:

```astro
---
import Renderer from "@json-render/astro/Renderer.astro";
import Counter from "../components/Counter"; // React, Vue, Svelte, or Solid
---

<!-- Static SSR (zero JS) -->
<Renderer spec={spec} registry={registry} />

<!-- Interactive island (hydrated client-side) -->
<Counter client:visible />
```

Supported island frameworks: React (`@json-render/react`), Vue (`@json-render/vue`), Svelte (`@json-render/svelte`), Solid (`@json-render/solid`). Each island uses its own `defineRegistry` + renderer internally. Static sections ship no JavaScript.

## Key Exports

| Export | Purpose |
|--------|---------|
| `defineRegistry` | Create a type-safe component registry from a catalog |
| `schema` | Element tree schema (static HTML, no actions) |

### Sub-path Exports

| Path | Purpose |
|------|---------|
| `@json-render/astro` | Full package: schema, defineRegistry, types |
| `@json-render/astro/schema` | Schema only |
| `@json-render/astro/Renderer.astro` | Entry point Astro component |
| `@json-render/astro/ElementRenderer.astro` | Recursive element renderer |

### Types

| Export | Purpose |
|--------|---------|
| `AstroSchema` | Schema type |
| `AstroSpec<C>` | Infer the spec type from a catalog |
| `AstroComponentRegistry` | Registry mapping component names to Astro components |
| `Components<C>` | Typed registry for a specific catalog |
| `DefineRegistryResult` | Return type of `defineRegistry()` |
| `StateModel` | State model type (re-export from core) |

## Key Differences from Other Renderers

- **Static HTML output**: no client-side JavaScript, no hydration
- **No actions/events**: no `emit`, `on`, `setState`, `$bindState`; for interactivity, use a framework island
- **No providers**: no StateProvider, ActionProvider; state is passed as a Renderer prop
- **No hooks/composables**: components access props via `Astro.props`, children via `<slot />`
- **Same API pattern**: `defineRegistry(catalog, { components })` like React, Vue, Svelte, Solid
- **SSG + SSR**: works without adapter (SSG) and with any adapter (SSR)
