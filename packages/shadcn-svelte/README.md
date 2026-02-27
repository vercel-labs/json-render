# @json-render/shadcn-svelte

Pre-built [shadcn-svelte](https://www.shadcn-svelte.com/) components for json-render. Drop-in catalog definitions and Svelte implementations for 36 components built on Svelte 5 + Tailwind CSS.

## Installation

```bash
npm install @json-render/shadcn-svelte @json-render/core @json-render/svelte zod
```

## Quick Start

### 1. Create a Catalog

```ts
import { schema } from "@json-render/svelte/schema";
import { shadcnComponentDefinitions } from "@json-render/shadcn-svelte/catalog";

const catalog = schema.createCatalog({
  components: {
    Card: shadcnComponentDefinitions.Card,
    Stack: shadcnComponentDefinitions.Stack,
    Heading: shadcnComponentDefinitions.Heading,
    Button: shadcnComponentDefinitions.Button,
    Input: shadcnComponentDefinitions.Input,
  },
  actions: {},
});
```

### 2. Create a Registry

```ts
import { defineRegistry } from "@json-render/svelte";
import { shadcnComponents } from "@json-render/shadcn-svelte";

const { registry } = defineRegistry(catalog, {
  components: {
    Card: shadcnComponents.Card,
    Stack: shadcnComponents.Stack,
    Heading: shadcnComponents.Heading,
    Button: shadcnComponents.Button,
    Input: shadcnComponents.Input,
  },
});
```

### 3. Render

```svelte
<script lang="ts">
  import { Renderer, JsonUIProvider } from "@json-render/svelte";

  export let spec;
  export let registry;
</script>

<JsonUIProvider initialState={spec?.state ?? {}}>
  <Renderer {spec} {registry} />
</JsonUIProvider>
```

## Exports

| Entry Point | Exports |
|-------------|---------|
| `@json-render/shadcn-svelte` | `shadcnComponents`, `shadcnComponentDefinitions` |
| `@json-render/shadcn-svelte/catalog` | `shadcnComponentDefinitions` |

The `/catalog` entrypoint contains only Zod schemas (no renderer dependency), so it can be used in server-side code for prompt generation.
