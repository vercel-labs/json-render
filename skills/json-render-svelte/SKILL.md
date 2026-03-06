---
name: json-render-svelte
description: Svelte 5 renderer for json-render that turns JSON specs into Svelte component trees. Use when working with @json-render/svelte, building Svelte UIs from JSON, creating component catalogs, or rendering AI-generated specs.
---

# @json-render/svelte

Svelte 5 renderer that converts json-render specs into Svelte component trees.

## Quick Start

```svelte
<script lang="ts">
  import { Renderer, JsonUIProvider } from "@json-render/svelte";
  import type { Spec } from "@json-render/svelte";
  import Card from "./components/Card.svelte";
  import Button from "./components/Button.svelte";

  interface Props {
    spec: Spec | null;
  }

  let { spec }: Props = $props();
  const registry = { Card, Button };
</script>

<JsonUIProvider>
  <Renderer {spec} {registry} />
</JsonUIProvider>
```

## Creating a Catalog

```typescript
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/svelte";
import { z } from "zod";

export const catalog = defineCatalog(schema, {
  components: {
    Button: {
      props: z.object({
        label: z.string(),
        variant: z.enum(["primary", "secondary"]).nullable(),
      }),
      description: "Clickable button",
    },
    Card: {
      props: z.object({ title: z.string() }),
      description: "Card container with title",
    },
  },
});
```

## Defining Components

Components should accept `BaseComponentProps<TProps>`:

```typescript
interface BaseComponentProps<TProps> {
  props: TProps; // Resolved props for this component
  children?: Snippet; // Child elements (use {@render children()})
  emit: (event: string) => void; // Fire a named event
  bindings?: Record<string, string>; // Map of prop names to state paths (for $bindState)
  loading?: boolean; // True while spec is streaming
}
```

```svelte
<!-- Button.svelte -->
<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";

  interface Props extends BaseComponentProps<{ label: string; variant?: string }> {}
  let { props, emit }: Props = $props();
</script>

<button class={props.variant} onclick={() => emit("press")}>
  {props.label}
</button>
```

```svelte
<!-- Card.svelte -->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { BaseComponentProps } from "@json-render/svelte";

  interface Props extends BaseComponentProps<{ title: string }> {
    children?: Snippet;
  }

  let { props, children }: Props = $props();
</script>

<div class="card">
  <h2>{props.title}</h2>
  {#if children}
    {@render children()}
  {/if}
</div>
```

## Creating a Registry

```typescript
import { defineRegistry } from "@json-render/svelte";
import { catalog } from "./catalog";
import Card from "./components/Card.svelte";
import Button from "./components/Button.svelte";

const { registry, handlers, executeAction } = defineRegistry(catalog, {
  components: {
    Card,
    Button,
  },
  actions: {
    submit: async (params, setState, state) => {
      // handle action
    },
  },
});
```

## Spec Structure (Element Tree)

The Svelte schema uses the element tree format:

```json
{
  "root": "card1",
  "elements": {
    "card1": {
      "type": "Card",
      "props": { "title": "Hello" },
      "children": ["btn1"]
    },
    "btn1": {
      "type": "Button",
      "props": { "label": "Click me" }
    }
  }
}
```

## Visibility Conditions

Use `visible` on elements to show/hide based on state:

- `{ "$state": "/path" }` - truthy check
- `{ "$state": "/path", "eq": value }` - equality check
- `{ "$state": "/path", "not": true }` - falsy check
- `{ "$and": [cond1, cond2] }` - AND conditions
- `{ "$or": [cond1, cond2] }` - OR conditions

## Providers (via JsonUIProvider)

`JsonUIProvider` composes all contexts. Individual contexts:

| Context             | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| `StateContext`      | Share state across components (JSON Pointer paths) |
| `ActionContext`     | Handle actions dispatched via the event system     |
| `VisibilityContext` | Enable conditional rendering based on state        |
| `ValidationContext` | Form field validation                              |

## Event System

Components use `emit` to fire named events. The element's `on` field maps events to action bindings:

```svelte
<!-- Button.svelte -->
<script lang="ts">
  import type { BaseComponentProps } from "@json-render/svelte";

  interface Props extends BaseComponentProps<{ label: string }> {}

  let { props, emit }: Props = $props();
</script>

<button onclick={() => emit("press")}>{props.label}</button>
```

```json
{
  "type": "Button",
  "props": { "label": "Submit" },
  "on": { "press": { "action": "submit" } }
}
```

## Built-in Actions

The `setState` action is handled automatically and updates the state model:

```json
{
  "action": "setState",
  "actionParams": { "statePath": "/activeTab", "value": "home" }
}
```

Other built-in actions: `pushState`, `removeState`, `push`, `pop`.

## Dynamic Props and Two-Way Binding

Expression forms resolved before your component receives props:

- `{"$state": "/state/key"}` - read from state
- `{"$bindState": "/form/email"}` - read + write-back to state
- `{"$bindItem": "field"}` - read + write-back for repeat items
- `{"$cond": <condition>, "$then": <value>, "$else": <value>}` - conditional value

For writable bindings inside components, use `getBoundProp`:

```svelte
<script lang="ts">
  import { getBoundProp } from "@json-render/svelte";
  import type { BaseComponentProps } from "@json-render/svelte";

  interface Props extends BaseComponentProps<{ value?: string }> {}
  let { props, bindings }: Props = $props();

  let value = getBoundProp<string>(
    () => props.value,
    () => bindings?.value,
  );
</script>

<input bind:value={value.current} />
```

## Context Helpers

Preferred helpers:

- `getStateValue(path)` - returns `{ current }` (read/write)
- `getBoundProp(() => value, () => bindingPath)` - returns `{ current }` (read/write when bound)
- `isVisible(condition)` - returns `{ current }` (boolean)
- `getAction(name)` - returns `{ current }` (registered handler)

Advanced context access:

- `getStateContext()`
- `getActionContext()`
- `getVisibilityContext()`
- `getValidationContext()`
- `getOptionalValidationContext()`
- `getFieldValidation(ctx, path, config?)`

## Streaming UI

Use `createUIStream` for spec streaming:

```svelte
<script lang="ts">
  import { createUIStream, Renderer } from "@json-render/svelte";

  const stream = createUIStream({
    api: "/api/generate-ui",
    onComplete: (spec) => console.log("Done", spec),
  });

  async function generate() {
    await stream.send("Create a login form");
  }
</script>

<button onclick={generate} disabled={stream.isStreaming}>
  {stream.isStreaming ? "Generating..." : "Generate UI"}
</button>

{#if stream.spec}
  <Renderer spec={stream.spec} {registry} loading={stream.isStreaming} />
{/if}
```

Use `createChatUI` for chat + UI responses:

```typescript
const chat = createChatUI({ api: "/api/chat-ui" });
await chat.send("Build a settings panel");
```
