# @json-render/astro

Astro renderer for json-render. Turn JSON specs into Astro components with data binding and visibility.

## Installation

```bash
npm install @json-render/core @json-render/astro zod
```

Peer dependencies: `astro >=4.0.0` and `zod ^4.0.0`.

```bash
# For interactive islands, add a framework renderer:
npm install @json-render/react    # + @astrojs/react
npm install @json-render/vue      # + @astrojs/vue
npm install @json-render/svelte   # + @astrojs/svelte
npm install @json-render/solid    # + @astrojs/solid-js
```

## Quick Start

### 1. Create a Catalog

```typescript
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

### 2. Write Components as `.astro` Files

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

### 3. Create a Registry and Render

```astro
---
// src/pages/index.astro
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

The `<Renderer>` walks the spec tree and renders each element using the matching Astro component. Props are resolved automatically (`$state`, `$cond`, `$item`, `$index`, `$template`) and children are passed via `<slot />`.

### Renderer Props

- `spec` (`Spec`) -- the json-render spec to render (required)
- `registry` (`AstroComponentRegistry`) -- component registry from `defineRegistry()`
- `state` (`Record<string, unknown>`, optional) -- state for `$state`/`$cond` resolution (merged with `spec.state`)
- `loading` (`boolean`, optional) -- suppresses warnings for missing components/children during streaming
- `fallback` (`AstroComponentFactory`, optional) -- rendered when a component type is not found in the registry

## Spec Format

The Astro renderer uses the same flat element map format as the React, Vue, Svelte, and Solid renderers:

```typescript
interface Spec {
  root: string;                          // Key of the root element
  elements: Record<string, UIElement>;   // Flat map of elements by key
  state?: Record<string, unknown>;       // Optional initial state
}

interface UIElement {
  type: string;                          // Component name from catalog
  props: Record<string, unknown>;        // Component props
  children?: string[];                   // Keys of child elements
  visible?: VisibilityCondition;         // Visibility condition
  repeat?: RepeatConfig;                 // Repeat over a state array
}
```

Example spec:

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

## Visibility Conditions

```typescript
// Truthiness check
{ "$state": "/user/isAdmin" }

// Comparisons (flat style)
{ "$state": "/status", "eq": "active" }
{ "$state": "/count", "gt": 10 }

// Negation
{ "$state": "/maintenance", "not": true }

// Multiple conditions (implicit AND)
[
  { "$state": "/feature/enabled" },
  { "$state": "/maintenance", "not": true }
]

// Always / never
true   // always visible
false  // never visible
```

TypeScript helpers from `@json-render/core`:

```typescript
import { visibility } from "@json-render/core";

visibility.when("/path")       // { $state: "/path" }
visibility.unless("/path")     // { $state: "/path", not: true }
visibility.eq("/path", val)    // { $state: "/path", eq: val }
visibility.neq("/path", val)   // { $state: "/path", neq: val }
visibility.and(cond1, cond2)  // { $and: [cond1, cond2] }
visibility.always             // true
visibility.never              // false
```

## Dynamic Prop Expressions

Any prop value can use data-driven expressions that resolve at render time. The renderer resolves these transparently before passing props to components.

```json
{
  "type": "Badge",
  "props": {
    "label": { "$state": "/user/role" },
    "color": {
      "$cond": { "$state": "/user/role", "eq": "admin" },
      "$then": "red",
      "$else": "gray"
    }
  }
}
```

See [@json-render/core](../core/README.md) for full expression syntax.

## Component Props

Astro components receive resolved props via `Astro.props` and render children via `<slot />`:

```astro
---
// Badge.astro
interface Props {
  label: string;
  color?: string;
}
const { label, color = "gray" } = Astro.props;
---

<span class={`badge badge-${color}`}>{label}</span>
```

All dynamic expressions (`$state`, `$cond`, `$item`, `$index`, `$template`) are resolved before props reach the component. Astro auto-escapes expressions, so no manual XSS protection is needed.

> **Note:** Astro components are static HTML. For interactive elements (click handlers, form inputs, client-side state), use an Astro island with a framework renderer (`@json-render/react`, `/vue`, `/svelte`, `/solid`).

## SSG vs SSR

The package works in both modes without modification:

- **SSG** (default, no adapter) -- state is resolved at build time. Ideal for static or pre-known content.
- **SSR** (with adapter) -- state is resolved at each request. Enables dynamic content (DB data, auth, etc.).

The choice is a project-level Astro decision, not a package concern. No adapter is required for the package to work.

## Astro Islands

Use `@json-render/astro` for static content and framework renderers for interactive islands.

```astro
---
import Renderer from "@json-render/astro/Renderer.astro";
import Counter from "../components/Counter"; // React component

const { registry } = defineRegistry(catalog, {
  components: { Section, Card, Heading, Text },
});
---

<!-- Static SSR content (zero JS sent to browser) -->
<Renderer spec={spec} registry={registry} />

<!-- Interactive React island (hydrated client-side) -->
<Counter client:visible />
```

Each island component uses its own `@json-render/*` renderer internally (e.g., `defineRegistry` + `Renderer` from `@json-render/react`). The static sections ship zero JavaScript to the browser.

Works with any Astro framework integration: React, Vue, Svelte, Solid.

See the [islands example](https://github.com/vercel-labs/json-render/tree/main/examples/astro/src/pages/islands.astro) for a working implementation with React.

## Generate AI Prompts

```typescript
const systemPrompt = catalog.prompt();
// Returns detailed prompt with component descriptions and Astro-specific rules
```

## Full Example

```astro
---
// src/pages/index.astro
import { defineCatalog } from "@json-render/core";
import { schema, defineRegistry } from "@json-render/astro";
import Renderer from "@json-render/astro/Renderer.astro";
import { z } from "zod";

// 1. Catalog
const catalog = defineCatalog(schema, {
  components: {
    Greeting: {
      props: z.object({ name: z.string() }),
      description: "Displays a greeting",
    },
  },
});

// 2. Component (inline for brevity; normally a separate .astro file)
import GreetingComponent from "../components/Greeting.astro";

// 3. Registry
const { registry } = defineRegistry(catalog, {
  components: { Greeting: GreetingComponent },
});

// 4. Spec
const spec = {
  root: "greeting-1",
  elements: {
    "greeting-1": {
      type: "Greeting",
      props: { name: "World" },
      children: [],
    },
  },
};
---

<Renderer spec={spec} registry={registry} />
```

```astro
---
// src/components/Greeting.astro
interface Props { name: string; }
const { name } = Astro.props;
---

<h1>Hello, {name}!</h1>
```

## Key Exports

| Export | Purpose |
|--------|---------|
| `defineRegistry` | Create a type-safe component registry from a catalog |
| `schema` | Element tree schema (static HTML, no actions) |

### Sub-path Exports

| Export | Purpose |
|--------|---------|
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

## Differences from Other Renderers

| Aspect | React / Vue / Svelte / Solid | Astro |
|--------|------------------------------|-------|
| Output | Client-side interactive UI | Static HTML (zero JS) |
| Components | Framework components / render functions | `.astro` files with `<slot />` |
| Actions | `emit()`, `on()`, built-in state actions | None (use islands for interactivity) |
| State mutations | `$bindState`, `setState` action | Read-only (`$state`, `$cond`) |
| Providers | StateProvider, ActionProvider, etc. | None (state passed as prop) |
| Hooks / Composables | `useStateStore`, `useActions`, etc. | None (static rendering) |

## Documentation

Full API reference: [json-render.dev/docs/api/astro](https://json-render.dev/docs/api/astro).

## License

Apache-2.0
