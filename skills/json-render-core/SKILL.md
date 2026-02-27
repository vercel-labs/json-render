---
name: json-render-core
description: Core package for defining schemas, catalogs, and AI prompt generation for json-render. Use when working with @json-render/core, defining schemas, creating catalogs, or building JSON specs for UI/video generation.
---

# @json-render/core

Core package for schema definition, catalog creation, and spec streaming.

## Key Concepts

- **Schema**: Defines the structure of specs and catalogs (use `defineSchema`)
- **Catalog**: Maps component/action names to their definitions (use `defineCatalog`)
- **Spec**: JSON output from AI that conforms to the schema
- **SpecStream**: JSONL streaming format for progressive spec building

## Defining a Schema

```typescript
import { defineSchema } from "@json-render/core";

export const schema = defineSchema((s) => ({
  spec: s.object({
    // Define spec structure
  }),
  catalog: s.object({
    components: s.map({
      props: s.zod(),
      description: s.string(),
    }),
  }),
}), {
  promptTemplate: myPromptTemplate, // Optional custom AI prompt
});
```

## Creating a Catalog

```typescript
import { defineCatalog } from "@json-render/core";
import { schema } from "./schema";
import { z } from "zod";

export const catalog = defineCatalog(schema, {
  components: {
    Button: {
      props: z.object({
        label: z.string(),
        variant: z.enum(["primary", "secondary"]).nullable(),
      }),
      description: "Clickable button component",
    },
  },
});
```

## Generating AI Prompts

```typescript
const systemPrompt = catalog.prompt(); // Uses schema's promptTemplate
const systemPrompt = catalog.prompt({ customRules: ["Rule 1", "Rule 2"] });
```

## SpecStream Utilities

For streaming AI responses (JSONL patches):

```typescript
import { createSpecStreamCompiler } from "@json-render/core";

const compiler = createSpecStreamCompiler<MySpec>();

// Process streaming chunks
const { result, newPatches } = compiler.push(chunk);

// Get final result
const finalSpec = compiler.getResult();
```

## Dynamic Prop Expressions

Any prop value can be a dynamic expression resolved at render time:

- **`{ "$state": "/state/key" }`** - reads a value from the state model (one-way read)
- **`{ "$bindState": "/path" }`** - two-way binding: reads from state and enables write-back. Use on the natural value prop (value, checked, pressed, etc.) of form components.
- **`{ "$bindItem": "field" }`** - two-way binding to a repeat item field. Use inside repeat scopes.
- **`{ "$cond": <condition>, "$then": <value>, "$else": <value> }`** - evaluates a visibility condition and picks a branch
- **`{ "$template": "Hello, ${/user/name}!" }`** - interpolates `${/path}` references with state values
- **`{ "$computed": "fnName", "args": { "key": <expression> } }`** - calls a registered function with resolved args

`$cond` uses the same syntax as visibility conditions (`$state`, `eq`, `neq`, `not`, arrays for AND). `$then` and `$else` can themselves be expressions (recursive).

Components do not use a `statePath` prop for two-way binding. Instead, use `{ "$bindState": "/path" }` on the natural value prop (e.g. `value`, `checked`, `pressed`).

```json
{
  "color": {
    "$cond": { "$state": "/activeTab", "eq": "home" },
    "$then": "#007AFF",
    "$else": "#8E8E93"
  },
  "label": { "$template": "Welcome, ${/user/name}!" },
  "fullName": {
    "$computed": "fullName",
    "args": {
      "first": { "$state": "/form/firstName" },
      "last": { "$state": "/form/lastName" }
    }
  }
}
```

```typescript
import { resolvePropValue, resolveElementProps } from "@json-render/core";

const resolved = resolveElementProps(element.props, { stateModel: myState });
```

## State Watchers

Elements can declare a `watch` field (top-level, sibling of type/props/children) to trigger actions when state values change:

```json
{
  "type": "Select",
  "props": { "value": { "$bindState": "/form/country" }, "options": ["US", "Canada"] },
  "watch": {
    "/form/country": { "action": "loadCities", "params": { "country": { "$state": "/form/country" } } }
  },
  "children": []
}
```

Watchers only fire on value changes, not on initial render.

## Validation

Built-in validation functions: `required`, `email`, `url`, `numeric`, `minLength`, `maxLength`, `min`, `max`, `pattern`, `matches`, `equalTo`, `lessThan`, `greaterThan`, `requiredIf`.

Cross-field validation uses `$state` expressions in args:

```typescript
import { check } from "@json-render/core";

check.required("Field is required");
check.matches("/form/password", "Passwords must match");
check.lessThan("/form/endDate", "Must be before end date");
check.greaterThan("/form/startDate", "Must be after start date");
check.requiredIf("/form/enableNotifications", "Required when enabled");
```

## User Prompt Builder

Build structured user prompts with optional spec refinement and state context:

```typescript
import { buildUserPrompt } from "@json-render/core";

// Fresh generation
buildUserPrompt({ prompt: "create a todo app" });

// Refinement (patch-only mode)
buildUserPrompt({ prompt: "add a toggle", currentSpec: spec });

// With runtime state
buildUserPrompt({ prompt: "show data", state: { todos: [] } });
```

## Spec Validation

Validate spec structure and auto-fix common issues:

```typescript
import { validateSpec, autoFixSpec } from "@json-render/core";

const { valid, issues } = validateSpec(spec);
const fixed = autoFixSpec(spec);
```

## Visibility Conditions

Control element visibility with state-based conditions. `VisibilityContext` is `{ stateModel: StateModel }`.

```typescript
import { visibility } from "@json-render/core";

// Syntax
{ "$state": "/path" }                    // truthiness
{ "$state": "/path", "not": true }      // falsy
{ "$state": "/path", "eq": value }      // equality
[ cond1, cond2 ]                         // implicit AND

// Helpers
visibility.when("/path")                 // { $state: "/path" }
visibility.unless("/path")               // { $state: "/path", not: true }
visibility.eq("/path", val)              // { $state: "/path", eq: val }
visibility.and(cond1, cond2)             // { $and: [cond1, cond2] }
visibility.or(cond1, cond2)              // { $or: [cond1, cond2] }
visibility.always                        // true
visibility.never                         // false
```

## Built-in Actions in Schema

Schemas can declare `builtInActions` -- actions that are always available at runtime and auto-injected into prompts:

```typescript
const schema = defineSchema(builder, {
  builtInActions: [
    { name: "setState", description: "Update a value in the state model" },
  ],
});
```

These appear in prompts as `[built-in]` and don't require handlers in `defineRegistry`.

## StateStore

The `StateStore` interface allows external state management libraries (Redux, Zustand, XState, etc.) to be plugged into json-render renderers. The `createStateStore` factory creates a simple in-memory implementation:

```typescript
import { createStateStore, type StateStore } from "@json-render/core";

const store = createStateStore({ count: 0 });

store.get("/count");         // 0
store.set("/count", 1);      // updates and notifies subscribers
store.update({ "/a": 1, "/b": 2 }); // batch update

store.subscribe(() => {
  console.log(store.getSnapshot()); // { count: 1 }
});
```

The `StateStore` interface: `get(path)`, `set(path, value)`, `update(updates)`, `getSnapshot()`, `subscribe(listener)`.

## Key Exports

| Export | Purpose |
|--------|---------|
| `defineSchema` | Create a new schema |
| `defineCatalog` | Create a catalog from schema |
| `createStateStore` | Create a framework-agnostic in-memory `StateStore` |
| `resolvePropValue` | Resolve a single prop expression against data |
| `resolveElementProps` | Resolve all prop expressions in an element |
| `buildUserPrompt` | Build user prompts with refinement and state context |
| `validateSpec` | Validate spec structure |
| `autoFixSpec` | Auto-fix common spec issues |
| `createSpecStreamCompiler` | Stream JSONL patches into spec |
| `createJsonRenderTransform` | TransformStream separating text from JSONL in mixed streams |
| `parseSpecStreamLine` | Parse single JSONL line |
| `applySpecStreamPatch` | Apply patch to object |
| `StateStore` | Interface for plugging in external state management |
| `ComputedFunction` | Function signature for `$computed` expressions |
| `check` | TypeScript helpers for creating validation checks |
| `BuiltInAction` | Type for built-in action definitions (`name` + `description`) |
| `ActionBinding` | Action binding type (includes `preventDefault` field) |
