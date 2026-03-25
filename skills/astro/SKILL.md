---
name: astro
description: "Astro renderer for @json-render/core — static HTML output, zero JS. Use this skill whenever the user works with @json-render/astro, defines an Astro catalog or registry, renders JSON specs in .astro pages, uses Astro Islands with json-render, mentions SSG or SSR rendering with json-render, deploys json-render to Cloudflare Workers or edge runtimes, or asks about rendering specs without client-side JavaScript. Also trigger when the user imports from '@json-render/astro' or mentions 'Renderer.astro'."
metadata:
  tags: astro, ssr, ssg, html, json-render, islands, edge, static, cloudflare
---

# @json-render/astro

Astro renderer that converts json-render specs into Astro component trees. Produces **static HTML with zero client-side JavaScript**. For interactivity, combine with Astro Islands using framework renderers.

## Installation

```bash
npm install @json-render/astro @json-render/core zod
```

Requires `astro >= 4.0.0` as a peer dependency (installed as part of any Astro project). For islands, also install the relevant framework integration (e.g., `@astrojs/react` + `@json-render/react`).

## Quick Start

```astro
---
import Renderer from "@json-render/astro/Renderer.astro";
import { defineRegistry } from "@json-render/astro";
import { catalog } from "../lib/catalog";
import Card from "../components/Card.astro";
import AstroText from "../components/AstroText.astro";

const { registry } = defineRegistry(catalog, {
  components: { Card, Text: AstroText }, // alias: catalog name → component
});

const spec = await getSpec(); // from DB, CMS, AI, etc.
---

<Renderer spec={spec} registry={registry} state={{ showBanner: true }} />
```

Component names in `defineRegistry` must match catalog component names exactly. Use aliasing when the `.astro` filename differs (e.g., `Text: AstroText` maps catalog's `Text` to `AstroText.astro`).

## Creating a Catalog

```ts
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/astro";
import { z } from "zod";

export const catalog = defineCatalog(schema, {
  components: {
    Heading: {
      props: z.object({
        text: z.string(),
        level: z.number().min(1).max(6).default(2),
      }),
      description: "Section heading (h1–h6)",
    },
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
    Badge: {
      props: z.object({
        label: z.string(),
        variant: z.enum(["info", "success", "warning"]).default("info"),
      }),
      description: "Status badge",
    },
  },
});
```

The Astro schema has **no actions** — catalogs only define components. For interactivity (buttons, forms), use framework islands.

## Defining Components

Astro components receive resolved props via `Astro.props` and render children via `<slot />`:

```astro
---
// Heading.astro
interface Props { text: string; level?: number; }
const { text, level = 2 } = Astro.props;
const Tag = `h${level}` as any;
---

<Tag>{text}</Tag>
```

```astro
---
// Card.astro
interface Props { title: string; subtitle?: string; }
const { title, subtitle } = Astro.props;
---

<article class="card">
  <h3>{title}</h3>
  {subtitle && <p class="subtitle">{subtitle}</p>}
  <slot />
</article>
```

All dynamic expressions (`$state`, `$cond`, `$item`, `$index`, `$template`) are resolved **before** props reach the component. Astro auto-escapes expressions — no manual XSS protection needed.

## Spec Structure (Element Tree)

Flat element tree, same pattern as all json-render renderers:

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
  },
  "state": {
    "showBanner": true
  }
}
```

Each element has `type`, `props`, `children`, and optional `visible` and `repeat`.

## Visibility Conditions

Place `visible` on the **element object** (not inside `props` — this is a common mistake):

```json
{
  "type": "Badge",
  "props": { "label": "Admin" },
  "visible": { "$state": "/user/isAdmin" },
  "children": []
}
```

Condition forms:
- `{ "$state": "/path" }` — truthy check
- `{ "$state": "/path", "eq": value }` — equality
- `{ "$state": "/path", "not": true }` — falsy check
- `{ "$and": [cond1, cond2] }` — AND
- `{ "$or": [cond1, cond2] }` — OR

## Dynamic Prop Expressions

Resolved before your component receives props:

- `{ "$state": "/state/key" }` — reads from state model
- `{ "$cond": <condition>, "$then": <value>, "$else": <value> }` — conditional value
- `{ "$template": "Hello, ${/name}!" }` — interpolates state values into strings
- `{ "$item": "field" }` — reads from current repeat item
- `{ "$index": true }` — current repeat index

No two-way binding (`$bindState`, `$bindItem`) since Astro produces static HTML. For forms, use an Astro island with a framework renderer.

## Repeat (List Rendering)

Use `repeat` on an element to iterate over a state array:

```json
{
  "root": "list-1",
  "elements": {
    "list-1": {
      "type": "List",
      "props": { "title": "Team" },
      "children": ["member"],
      "repeat": null
    },
    "member": {
      "type": "Card",
      "props": {
        "title": { "$item": "name" },
        "subtitle": { "$item": "role" }
      },
      "children": [],
      "repeat": { "statePath": "/team", "key": "id" }
    }
  },
  "state": {
    "team": [
      { "id": "1", "name": "Alice", "role": "Engineer" },
      { "id": "2", "name": "Bob", "role": "Designer" }
    ]
  }
}
```

- `statePath` — JSON pointer to the array in state
- `key` — field name for stable keys (falls back to array index)
- Inside repeated elements, use `{ "$item": "fieldName" }` and `{ "$index": true }` in props
- Nested repeats are supported (creates cartesian product)

## Renderer Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `spec` | `Spec` | Yes | The json-render spec to render |
| `registry` | `AstroComponentRegistry` | Yes | Component registry from `defineRegistry()` |
| `state` | `Record<string, unknown>` | No | Runtime state, merged with `spec.state` (runtime wins) |
| `loading` | `boolean` | No | Suppresses missing component warnings during streaming |
| `fallback` | `AstroComponentFactory` | No | Rendered for unknown component types |

### Fallback Component

Use `fallback` during development to visualize missing components:

```astro
---
import Fallback from "../components/Fallback.astro";
---

<Renderer spec={spec} registry={registry} fallback={Fallback} />
```

## SSG vs SSR

Works in both modes without code changes:
- **SSG** (default, no adapter): state resolved at build time
- **SSR** (with adapter — Vercel, Cloudflare, Netlify, Node): state resolved per request

```astro
---
// SSR example: inject request-time data into state
const requestState = {
  userRole: Astro.locals.user?.role ?? "guest",
  serverTime: new Date().toISOString(),
};
---

<Renderer spec={spec} registry={registry} state={requestState} />
```

The choice is a project-level Astro config decision (`output: 'static'` vs `output: 'server'`), not a package concern.

## Astro Islands Pattern

Use `@json-render/astro` for static content and framework renderers for interactive parts:

```astro
---
import Renderer from "@json-render/astro/Renderer.astro";
import Counter from "../components/Counter"; // React component
---

<!-- Static content (zero JS) -->
<Renderer spec={spec} registry={registry} />

<!-- Interactive island (hydrated client-side) -->
<Counter client:visible initialCount={0} />
```

Supported island frameworks: React (`@json-render/react`), Vue (`@json-render/vue`), Svelte (`@json-render/svelte`), Solid (`@json-render/solid`). Each island uses its own `defineRegistry` + renderer internally. Static sections ship no JavaScript.

## Exports

| Export | Path | Purpose |
|--------|------|---------|
| `defineRegistry` | `@json-render/astro` | Create a type-safe component registry |
| `schema` | `@json-render/astro` | Element tree schema (static HTML, no actions) |
| `defineCatalog` | `@json-render/astro` | Re-export from core |
| `Renderer` | `@json-render/astro/Renderer.astro` | Entry point component |
| `ElementRenderer` | `@json-render/astro/ElementRenderer.astro` | Recursive element renderer (internal) |
| Schema only | `@json-render/astro/schema` | For schema-only imports |

### Types

| Type | Purpose |
|------|---------|
| `AstroSchema` | Schema type |
| `AstroSpec<C>` | Infer the spec type from a catalog |
| `AstroComponentRegistry` | Registry mapping component names → Astro components |
| `Components<C>` | Typed component map for a specific catalog |
| `DefineRegistryResult` | Return type of `defineRegistry()` |
| `StateModel` | State model type (re-export from core) |
| `Spec` | Spec type (re-export from core) |

## Common Mistakes

1. **`visible` inside props** — Place `visible` on the element, not inside `props`. The renderer checks the element-level field; anything in props is ignored by the visibility system.
2. **Missing child elements** — If `children: ["foo"]` but `"foo"` is not in `elements`, that branch silently renders nothing. Always ensure every child key maps to a defined element.
3. **Empty state arrays** — When using `repeat`, include realistic sample data in `spec.state`. An empty array renders nothing and gives no signal that the feature works.
4. **Actions in catalog** — The Astro schema has no action system. If you define actions, they won't be accessible. Use framework islands for interactivity.
5. **`$bindState` in props** — Two-way binding doesn't work in static HTML. Use `$state` (read-only) and move mutations to framework islands.

## Key Differences from Other Renderers

- **Static HTML output**: zero client-side JavaScript, no hydration
- **No actions/events**: no `emit`, `on`, `setState`, `$bindState`; for interactivity → framework island
- **No providers**: no StateProvider, ActionProvider; state passed as Renderer prop
- **No hooks/composables**: components use `Astro.props` + `<slot />`
- **Same API pattern**: `defineRegistry(catalog, { components })` like React, Vue, Svelte, Solid
- **SSG + SSR**: works without adapter (SSG) and with any adapter (SSR)
