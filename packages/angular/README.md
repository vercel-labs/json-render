# @json-render/angular

Angular renderer for [`@json-render/core`](https://json-render.dev). JSON becomes Angular components.

AI (or any producer) generates a JSON spec constrained to a catalog you define, and this package renders it as live, standalone Angular components — built on signals and dependency injection. The spec format is identical across every json-render renderer, so a spec authored for React, Vue, or Solid renders unchanged here.

## Installation

```bash
pnpm add @json-render/angular @json-render/core zod
```

Requires Angular 20, 21, or 22.

## Quick Start

### 1. Create a Catalog

The catalog declares the components the AI is allowed to use, with a Zod schema for each component's props.

```ts
import { defineCatalog, schema } from "@json-render/angular";
import { z } from "zod";

export const catalog = defineCatalog(schema, {
  components: {
    Card: {
      props: z.object({ title: z.string() }),
      description: "A titled container",
      slots: ["default"],
    },
    Text: {
      props: z.object({ value: z.string() }),
      description: "A line of text",
      slots: [],
    },
  },
  actions: {},
});
```

### 2. Define Component Implementations

Each catalog component maps to a standalone Angular component. The renderer sets `element`, `emit`, `on`, `bindings`, and `loading` as inputs. Use `ChildrenOutletDirective` to mark where children render.

```ts
import { Component, input } from "@angular/core";
import { ChildrenOutletDirective, type JsonRenderComponent } from "@json-render/angular";

@Component({
  selector: "app-card",
  standalone: true,
  imports: [ChildrenOutletDirective],
  template: `
    <section class="card">
      <h3>{{ element().props.title }}</h3>
      <ng-template jsonRenderChildren></ng-template>
    </section>
  `,
})
export class CardComponent implements Partial<JsonRenderComponent> {
  readonly element = input.required<{ props: { title: string } }>();
}

@Component({
  selector: "app-text",
  standalone: true,
  template: `<p>{{ element().props.value }}</p>`,
})
export class TextComponent {
  readonly element = input.required<{ props: { value: string } }>();
}
```

### 3. Render Specs

Provide the registry, then drop `<json-render>` into a template.

```ts
import { Component, signal } from "@angular/core";
import { JsonRendererComponent, provideJsonRender, defineRegistry } from "@json-render/angular";
import type { Spec } from "@json-render/angular";

import { catalog } from "./catalog";
import { CardComponent } from "./card.component";
import { TextComponent } from "./text.component";

const { registry } = defineRegistry(catalog, {
  components: { Card: CardComponent, Text: TextComponent },
});

@Component({
  selector: "app-demo",
  standalone: true,
  imports: [JsonRendererComponent],
  providers: [provideJsonRender({ registry })],
  template: `<json-render [spec]="spec()" />`,
})
export class DemoComponent {
  readonly spec = signal<Spec>({
    root: "card",
    elements: {
      card: { type: "Card", props: { title: "Hello" }, children: ["greeting"] },
      greeting: { type: "Text", props: { value: "Rendered from JSON" }, children: [] },
    },
  });
}
```

Prefer a single call? `createRenderer` wires the registry and providers for you:

```ts
import { createRenderer } from "@json-render/angular";

const { providers, JsonRenderer } = createRenderer(catalog, {
  components: { Card: CardComponent, Text: TextComponent },
});

// providers -> route/bootstrap/component providers
// JsonRenderer -> import into a standalone component and use <json-render />
```

## Spec Format

A spec is a flat map of elements referenced by key:

```json
{
  "root": "container",
  "elements": {
    "container": { "type": "Card", "props": { "title": "Tasks" }, "children": ["item"] },
    "item": { "type": "Text", "props": { "value": "Buy milk" }, "children": [] }
  },
  "state": { "tasks": [] }
}
```

- `root` — key of the root element.
- `elements` — flat map; `children` holds child keys (not nested objects).
- `state` — optional seed state model.
- Each element may declare `visible`, `on` (events), `repeat` (lists), and `watch` (state watchers).

## Dependency Injection

`provideJsonRender(options)` is the Angular equivalent of the other renderers' provider. Register it at the route, bootstrap, or component level.

```ts
provideJsonRender({
  registry,
  handlersFactory,       // from defineRegistry(...).handlers, for stateful actions
  navigate: (path) => router.navigateByUrl(path),
  fallback: FallbackComponent,       // for unknown types / render errors
  functions: { upper: (s) => String(s).toUpperCase() }, // $computed functions
  directives,            // custom $-prefixed directive registry
  validationFunctions,   // custom field validators
});
```

## State, Visibility, Validation, Actions

The renderer provides scoped injectable services (the Angular counterpart of the other renderers' contexts/hooks). Inject them inside `<json-render>`:

- `SpecStateService` — signal-backed state store (`state()`, `get`, `set`, `update`, `watch`, `onChange`). Accepts an external `StateStore` via the `[store]` input.
- `VisibilityService` — evaluate `visible` conditions.
- `ValidationService` — per-field register/validate/touch/clear + `validateAll()`.
- `ActionDispatcherService` — resolve and run `on`/`watch` actions, with `loadingActions` and `pendingConfirmation` signals.
- `RepeatScopeService` — the current `$item`/`$index` scope inside a `repeat`.

`onStateChange` reports change deltas (`Array<{ path, value }>`), matching the other renderers:

```html
<json-render [spec]="spec()" [onStateChange]="handleChange" />
```

## Visibility Conditions

`visible` lives on the element (not in `props`):

```json
{ "type": "Text", "props": { "value": "Admin only" }, "visible": { "$state": "/role", "eq": "admin" } }
```

Supports single conditions, implicit-AND arrays, and `$and`/`$or`. Inside a `repeat`, `$item`/`$index` filter the list:

```json
{
  "type": "Stack",
  "props": {},
  "repeat": { "statePath": "/tasks", "key": "id" },
  "visible": { "$item": "status", "eq": "todo" },
  "children": ["row"]
}
```

Only the items whose `status` is `"todo"` render — ideal for kanban columns and filtered lists.

## Dynamic Prop Expressions

Props can reference state and the current repeat item:

- `{ "$state": "/path" }` — read from state.
- `{ "$bindState": "/path" }` — two-way binding (see `injectBoundProp`).
- `{ "$item": "field" }` / `{ "$bindItem": "field" }` — read/bind a repeat item field.
- `{ "$index": true }` — the current repeat index.
- `{ "$template": "Hi ${/name}" }` — string interpolation.
- `{ "$computed": "fnName", "args": [...] }` — call a registered function.
- `{ "$cond": <visibility>, "$then": ..., "$else": ... }` — conditional value.

## State Watchers

`watch` fires actions when a state path changes:

```json
{ "type": "Form", "props": {}, "watch": { "/query": { "action": "search" } }, "children": [] }
```

## Built-in Actions

Available without registering handlers:

- `setState` — `{ statePath, value }`
- `pushState` — `{ statePath, value, clearStatePath? }` (supports `$state` refs and `$id`)
- `removeState` — `{ statePath, index }`
- `push` / `pop` — navigation via the `navigate` callback
- `validateForm` — runs all field validations and writes `{ valid, errors }` to state (default `/formValidation`); it does not throw, so a chained follow-up action can read the result.

## Streaming and Chat

Angular-idiomatic `inject*` helpers mirror the other renderers' streaming hooks. Call them in an injection context.

```ts
import { injectUIStream } from "@json-render/angular";

export class Generator {
  private readonly stream = injectUIStream({ api: "/api/generate" });
  readonly spec = this.stream.spec; // Signal<Spec | null>
  ask = (prompt: string) => this.stream.send(prompt);
}
```

- `injectUIStream` — POST a prompt, apply the JSONL patch stream into a spec signal (with `usage`, `rawLines`, abort-on-destroy).
- `injectChatUI` — multi-turn chat where each assistant message carries text and/or a spec.
- `injectJsonRenderMessage` — derive `{ spec, text, hasSpec }` from AI SDK message parts.
- Pure helpers: `flatToTree`, `buildSpecFromParts`, `getTextFromParts`.

## Confirmation Dialogs

Actions can require confirmation. Drop in the ready-made dialog:

```html
<json-render [spec]="spec()">
  <json-render-confirm-dialog />
</json-render>
```

For custom markup/styles, compose the headless `JsonRenderConfirmDialogDirective` instead (no design-system dependency).

## Generate AI Prompts

The catalog builds the system prompt for you:

```ts
const prompt = catalog.prompt();
```

## Key Exports

| Export | Description |
| --- | --- |
| `JsonRendererComponent` (`<json-render>`) | Root renderer component |
| `provideJsonRender` | Register registry, handlers, functions, directives, fallback |
| `defineRegistry` | Map catalog names to Angular components + actions |
| `createRenderer` | One-call setup returning providers + the renderer |
| `schema` / `AngularSchema` / `AngularSpec` | Spec schema and types |
| `SpecStateService` / `VisibilityService` / `ValidationService` / `ActionDispatcherService` / `RepeatScopeService` | Scoped services |
| `ConfirmDialog` / `JsonRenderConfirmDialogDirective` | Styled and headless confirmation |
| `injectUIStream` / `injectChatUI` / `injectJsonRenderMessage` | Streaming and chat |
| `flatToTree` / `buildSpecFromParts` / `getTextFromParts` | Streaming helpers |
| `injectBoundProp` / `boundProp` | Two-way binding helper |
| `createStateStore` | External state store factory (re-export) |

## License

Apache-2.0
