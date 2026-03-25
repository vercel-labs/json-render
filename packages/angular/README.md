# @json-render/angular

Angular renderer for json-render. Turn JSON specs into Angular-managed DOM with signals, actions, visibility rules, and state bindings.

## Installation

```bash
npm install @json-render/core @json-render/angular zod
npm install @angular/core @angular/common @angular/platform-browser
```

## Quick Start

### 1. Create a Catalog

```typescript
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/angular/schema";
import { z } from "zod";

export const catalog = defineCatalog(schema, {
  components: {
    Card: {
      props: z.object({ title: z.string() }),
      description: "A card container",
    },
    Button: {
      props: z.object({ label: z.string() }),
      description: "Clickable button",
    },
  },
  actions: {
    submit: { description: "Submit the current form" },
  },
});
```

### 2. Define Component Renderers

```typescript
import { defineRegistry, element, text } from "@json-render/angular";

export const { registry } = defineRegistry(catalog, {
  components: {
    Card: ({ props, children }) =>
      element("div", { className: "card" }, [
        element("h3", {}, [text(props.title)]),
        ...(children ?? []),
      ]),
    Button: ({ props, emit }) =>
      element("button", { type: "button", onclick: () => emit("press") }, [
        text(props.label),
      ]),
  },
  actions: {
    submit: async () => {
      console.log("submitted");
    },
  },
});
```

### 3. Render Specs

```typescript
import { Component } from "@angular/core";
import { Renderer } from "@json-render/angular";
import { registry } from "./registry";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [Renderer],
  template: `
    <json-renderer
      [spec]="spec"
      [registry]="registry"
      [initialState]="{ form: { name: '' } }"
      [handlers]="handlers"
    />
  `,
})
export class AppComponent {
  registry = registry;
  handlers = {
    submit: async (params?: Record<string, unknown>) => {
      console.log("submit", params);
    },
  };

  spec = {
    root: "card-1",
    elements: {
      "card-1": {
        type: "Card",
        props: { title: "Hello Angular" },
        children: ["button-1"],
      },
      "button-1": {
        type: "Button",
        props: { label: "Submit" },
        on: { press: { action: "submit" } },
        children: [],
      },
    },
  };
}
```

## Key Exports

- `Renderer` renders a flat spec with optional local state/action inputs.
- `defineRegistry` creates a typed registry from a catalog.
- `createRenderer` creates a pre-bound standalone renderer component.
- `schema` is the Angular catalog/spec schema.
- `StateProvider`, `ActionProvider`, `VisibilityProvider`, and `ValidationProvider` are available for lower-level composition.
- `element`, `text`, `fragment`, and `component` help build VNode trees in registry functions.

## Notes

- The Angular adapter uses standalone components and Angular signals.
- Registry functions return lightweight VNodes rather than Angular templates.
- Built-in actions include `setState`, `pushState`, `removeState`, and `validateForm`.

## License

Apache-2.0
