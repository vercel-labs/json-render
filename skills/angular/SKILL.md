---
name: angular
description: Angular renderer for json-render that turns JSON specs into Angular components. Use when working with @json-render/angular, building Angular UIs from JSON, creating component catalogs, or rendering AI-generated specs with signals and dependency injection.
---

# @json-render/angular

Angular renderer that converts JSON specs into standalone Angular component trees, using signals and dependency injection. The spec format is identical to the other json-render renderers.

## Quick Start

```typescript
import { Component, input, signal } from "@angular/core";
import {
  JsonRendererComponent,
  defineRegistry,
  provideJsonRender,
} from "@json-render/angular";
import { catalog } from "./catalog";

@Component({
  selector: "app-card",
  standalone: true,
  template: `<div>{{ element().props.title }}</div>`,
})
class CardComponent {
  readonly element = input.required<{ props: { title: string } }>();
}

const { registry } = defineRegistry(catalog, {
  components: { Card: CardComponent },
});

@Component({
  selector: "app-root",
  standalone: true,
  imports: [JsonRendererComponent],
  providers: [provideJsonRender({ registry })],
  template: `<json-render [spec]="spec()" />`,
})
export class AppComponent {
  readonly spec = signal({
    root: "c",
    elements: { c: { type: "Card", props: { title: "Hi" }, children: [] } },
  });
}
```

## Creating a Catalog

```typescript
import { defineCatalog, schema } from "@json-render/angular";
import { z } from "zod";

export const catalog = defineCatalog(schema, {
  components: {
    Card: {
      props: z.object({ title: z.string() }),
      description: "A titled container",
      slots: ["default"],
    },
  },
  actions: {},
});
```

## Component Inputs

The renderer sets these inputs on each registered component (declare only the ones you use):

- `element` — the resolved `UIElement` (read `element().props`)
- `emit(event)` / `on(event)` — fire / inspect wired actions
- `bindings` — prop -> state path map for `$bindState`/`$bindItem`
- `loading` — streaming/loading flag

Use `ChildrenOutletDirective` (`jsonRenderChildren`) in a template to place children.

## Providers

`provideJsonRender({ registry, handlersFactory?, navigate?, fallback?, functions?, directives?, validationFunctions? })`.

Or `createRenderer(catalog, { components, actions? })` returns `{ providers, JsonRenderer }` in one call.

## Services (inject inside `<json-render>`)

- `SpecStateService` — `state()`, `get`, `set`, `update`, `watch`, `onChange`
- `VisibilityService`, `ValidationService`, `ActionDispatcherService`, `RepeatScopeService`

## Streaming & Chat

`injectUIStream`, `injectChatUI`, `injectJsonRenderMessage` (call in an injection context; return signals). Pure helpers: `flatToTree`, `buildSpecFromParts`, `getTextFromParts`.

## Built-in Actions

`setState`, `pushState`, `removeState`, `push`/`pop`, `validateForm` (writes `{ valid, errors }` to state, default `/formValidation`).

## Confirmation

Add `<json-render-confirm-dialog />` inside `<json-render>` for a ready-made dialog, or compose the headless `JsonRenderConfirmDialogDirective`.

## Build

Built with `ng-packagr` (Angular Package Format), like the Svelte package uses `svelte-package` — Angular components require the Angular compiler, which plain `tsup` cannot produce. Consumers add no extra runtime dependency.
