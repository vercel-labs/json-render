# @json-render/core

Core library for json-render. Define schemas, create catalogs, generate AI prompts, and stream specs.

## Installation

```bash
npm install @json-render/core zod
```

## Key Concepts

- **Schema**: Defines the structure of specs and catalogs
- **Catalog**: Maps component/action names to their definitions with Zod props
- **Spec**: JSON output from AI that conforms to the schema
- **SpecStream**: JSONL streaming format for progressive spec building

## Quick Start

### Define a Schema

```typescript
import { defineSchema } from "@json-render/core";

export const schema = defineSchema((s) => ({
  spec: s.object({
    root: s.object({
      type: s.ref("catalog.components"),
      props: s.propsOf("catalog.components"),
      children: s.array(s.string()), // Element keys (flat spec format)
    }),
  }),
  catalog: s.object({
    components: s.map({
      props: s.zod(),
      description: s.string(),
    }),
    actions: s.map({
      description: s.string(),
    }),
  }),
}), {
  promptTemplate: myPromptTemplate, // Optional custom AI prompt generator
});
```

### Create a Catalog

```typescript
import { defineCatalog } from "@json-render/core";
import { schema } from "./schema";
import { z } from "zod";

export const catalog = defineCatalog(schema, {
  components: {
    Card: {
      props: z.object({
        title: z.string(),
        subtitle: z.string().nullable(),
      }),
      description: "A card container with title",
    },
    Button: {
      props: z.object({
        label: z.string(),
        variant: z.enum(["primary", "secondary"]).nullable(),
      }),
      description: "A clickable button",
    },
  },
  actions: {
    submit: { description: "Submit the form" },
    cancel: { description: "Cancel and close" },
  },
});
```

### Generate AI Prompts

```typescript
// Generate system prompt for AI
const systemPrompt = catalog.prompt();

// With custom rules
const systemPrompt = catalog.prompt({
  system: "You are a dashboard builder.",
  customRules: [
    "Always include a header",
    "Use Card components for grouping",
  ],
});
```

### Stream AI Responses (SpecStream)

The SpecStream format uses JSONL patches to progressively build specs:

```typescript
import { createSpecStreamCompiler } from "@json-render/core";

// Create a compiler for your spec type
const compiler = createSpecStreamCompiler<MySpec>();

// Process streaming chunks from AI
while (streaming) {
  const chunk = await reader.read();
  const { result, newPatches } = compiler.push(chunk);
  
  if (newPatches.length > 0) {
    // Update UI with partial result
    setSpec(result);
  }
}

// Get final compiled result
const finalSpec = compiler.getResult();
```

SpecStream format uses [RFC 6902 JSON Patch](https://datatracker.ietf.org/doc/html/rfc6902) operations (each line is a patch):

```jsonl
{"op":"add","path":"/root","value":"card-1"}
{"op":"add","path":"/elements/card-1","value":{"type":"Card","props":{"title":"Hello"},"children":["btn-1"]}}
{"op":"add","path":"/elements/btn-1","value":{"type":"Button","props":{"label":"Click"},"children":[]}}
```

All six RFC 6902 operations are supported: `add`, `remove`, `replace`, `move`, `copy`, `test`.

### Low-Level Utilities

```typescript
import {
  parseSpecStreamLine,
  applySpecStreamPatch,
  compileSpecStream,
} from "@json-render/core";

// Parse a single line
const patch = parseSpecStreamLine('{"op":"add","path":"/root","value":{}}');
// { op: "add", path: "/root", value: {} }

// Apply a patch to an object
const obj = {};
applySpecStreamPatch(obj, patch);
// obj is now { root: {} }

// Compile entire JSONL string at once
const spec = compileSpecStream<MySpec>(jsonlString);
```

## API Reference

### Schema

| Export | Purpose |
|--------|---------|
| `defineSchema(builder, options?)` | Create a schema with spec/catalog structure |
| `SchemaBuilder` | Builder with `s.object()`, `s.array()`, `s.map()`, etc. |

Schema options:

| Option | Purpose |
|--------|---------|
| `promptTemplate` | Custom AI prompt generator |
| `defaultRules` | Default rules injected before custom rules in prompts |
| `builtInActions` | Actions always available at runtime, auto-injected into prompts (e.g. `setState`) |

### Catalog

| Export | Purpose |
|--------|---------|
| `defineCatalog(schema, data)` | Create a type-safe catalog from schema |
| `catalog.prompt(options?)` | Generate AI system prompt |

### SpecStream

| Export | Purpose |
|--------|---------|
| `createSpecStreamCompiler<T>()` | Create streaming compiler |
| `parseSpecStreamLine(line)` | Parse single JSONL line |
| `applySpecStreamPatch(obj, patch)` | Apply patch to object |
| `compileSpecStream<T>(jsonl)` | Compile entire JSONL string |

### Dynamic Props

| Export | Purpose |
|--------|---------|
| `resolvePropValue(value, ctx)` | Resolve a single prop expression |
| `resolveElementProps(props, ctx)` | Resolve all prop expressions in an element |
| `PropExpression<T>` | Type for prop values that may contain expressions |
| `ComputedFunction` | Function signature for `$computed` expressions |
| `PropResolutionContext` | Context for resolving props (includes `functions` for `$computed`) |

### Validation

| Export | Purpose |
|--------|---------|
| `check.required()` | Required validation helper |
| `check.email()` | Email validation helper |
| `check.matches(path)` | Cross-field match helper |
| `check.equalTo(path)` | Cross-field equality helper |
| `check.lessThan(path)` | Cross-field less-than helper |
| `check.greaterThan(path)` | Cross-field greater-than helper |
| `check.requiredIf(path)` | Conditional required helper |
| `builtInValidationFunctions` | All built-in validation functions |
| `runValidationCheck()` | Run a single validation check |

### User Prompt

| Export | Purpose |
|--------|---------|
| `buildUserPrompt(options)` | Build a user prompt with optional spec refinement and state context |
| `UserPromptOptions` | Options type for `buildUserPrompt` |

### Spec Validation

| Export | Purpose |
|--------|---------|
| `validateSpec(spec, options?)` | Validate spec structure and return issues |
| `autoFixSpec(spec)` | Auto-fix common spec issues (returns corrected copy) |
| `formatSpecIssues(issues)` | Format validation issues as readable strings |

### Actions

| Export | Purpose |
|--------|---------|
| `ActionBinding` | Action binding with `action`, `params`, `confirm`, `preventDefault`, etc. |
| `BuiltInAction` | Built-in action definition with `name` and `description` |

### Chat Mode (Mixed Streams)

| Export | Purpose |
|--------|---------|
| `createJsonRenderTransform()` | TransformStream that separates text from JSONL patches in a mixed stream |
| `pipeJsonRender()` | Server-side helper to pipe a mixed stream through the transform |
| `SPEC_DATA_PART` / `SPEC_DATA_PART_TYPE` | Constants for filtering spec data parts |

The transform splits text blocks around spec data by emitting `text-end`/`text-start` pairs, ensuring the AI SDK creates separate text parts and preserving correct interleaving of prose and UI in `message.parts`.

### State Store

| Export | Purpose |
|--------|---------|
| `createStateStore(initialState?)` | Create a framework-agnostic in-memory `StateStore` |
| `StateStore` | Interface for plugging in external state management (Redux, Zustand, XState, etc.) |
| `StateModel` | State model type (`Record<string, unknown>`) |

The `StateStore` interface allows renderers to use external state management instead of the built-in internal store:

```typescript
import { createStateStore, type StateStore } from "@json-render/core";

// Simple in-memory store
const store = createStateStore({ count: 0 });

store.get("/count");          // 0
store.set("/count", 1);       // updates and notifies subscribers
store.getSnapshot();          // { count: 1 }

// Subscribe to changes (compatible with React's useSyncExternalStore)
const unsubscribe = store.subscribe(() => {
  console.log("state changed:", store.getSnapshot());
});
```

Pass the store to `StateProvider` in any renderer package (`@json-render/react`, `@json-render/react-native`, `@json-render/react-pdf`) for controlled mode.

### Store Utilities (for adapter authors)

Available via `@json-render/core/store-utils`:

| Export | Purpose |
|--------|---------|
| `createStoreAdapter(config)` | Build a full `StateStore` from a minimal `{ getSnapshot, setSnapshot, subscribe }` config |
| `immutableSetByPath(root, path, value)` | Immutably set a value at a JSON Pointer path with structural sharing |
| `flattenToPointers(obj)` | Flatten a nested object into JSON Pointer keyed entries |
| `StoreAdapterConfig` | Config type for `createStoreAdapter` |

```typescript
import { createStoreAdapter, immutableSetByPath, flattenToPointers } from "@json-render/core/store-utils";
```

`createStoreAdapter` handles `get`, `set` (with no-op detection), batched `update`, `getSnapshot`, `getServerSnapshot`, and `subscribe` -- adapter authors only need to supply the snapshot source, write API, and subscribe mechanism:

```typescript
import { createStoreAdapter } from "@json-render/core/store-utils";

const store = createStoreAdapter({
  getSnapshot: () => myLib.getState(),
  setSnapshot: (next) => myLib.setState(next),
  subscribe: (listener) => myLib.subscribe(listener),
});
```

The official adapter packages (`@json-render/redux`, `@json-render/zustand`, `@json-render/jotai`) are all built on top of `createStoreAdapter`.

### Types

| Export | Purpose |
|--------|---------|
| `Spec` | Base spec type |
| `Catalog` | Catalog type |
| `BuiltInAction` | Built-in action type (`name` + `description`) |
| `ComputedFunction` | Function signature for `$computed` expressions |
| `VisibilityCondition` | Visibility condition type (used by `$cond`) |
| `VisibilityContext` | Context for evaluating visibility and prop expressions |
| `SpecStreamLine` | Single patch operation |
| `SpecStreamCompiler` | Streaming compiler interface |

## Dynamic Prop Expressions

Any prop value can be a dynamic expression that resolves based on data state at render time. Expressions are resolved by the renderer before props reach components.

### Data Binding (`$state`)

Read a value directly from the state model:

```json
{
  "color": { "$state": "/theme/primary" },
  "label": { "$state": "/user/name" }
}
```

### Two-Way Binding (`$bindState` / `$bindItem`)

Use `{ "$bindState": "/path" }` on the natural value prop for form components that need read/write access. The component reads from and writes to the state path:

```json
{
  "type": "Input",
  "props": {
    "value": { "$bindState": "/form/email" },
    "placeholder": "Email"
  }
}
```

Inside a repeat scope, use `{ "$bindItem": "completed" }` to bind to a field on the current item:

### Conditional (`$cond` / `$then` / `$else`)

Evaluate a condition (same syntax as visibility conditions) and pick a value:

```json
{
  "color": {
    "$cond": { "$state": "/activeTab", "eq": "home" },
    "$then": "#007AFF",
    "$else": "#8E8E93"
  },
  "name": {
    "$cond": { "$state": "/activeTab", "eq": "home" },
    "$then": "home",
    "$else": "home-outline"
  }
}
```

`$then` and `$else` can themselves be expressions (recursive):

```json
{
  "label": {
    "$cond": { "$state": "/user/isAdmin" },
    "$then": { "$state": "/admin/greeting" },
    "$else": "Welcome"
  }
}
```

### Repeat Item (`$item`)

Inside children of a repeated element, read a field from the current array item:

```json
{ "$item": "title" }
```

Use `""` to get the entire item object. `$item` takes a path string because items are typically objects with nested fields to navigate.

### Repeat Index (`$index`)

Get the current array index inside a repeat:

```json
{ "$index": true }
```

`$index` uses `true` as a sentinel flag because the index is a scalar value with no sub-path to navigate (unlike `$item` which needs a path).

### Template (`$template`)

Interpolate state values into strings using `${/path}` syntax:

```json
{
  "label": { "$template": "Hello, ${/user/name}! You have ${/inbox/count} messages." }
}
```

Missing paths resolve to an empty string.

### Computed (`$computed`)

Call a registered function with resolved arguments:

```json
{
  "text": {
    "$computed": "fullName",
    "args": {
      "first": { "$state": "/form/firstName" },
      "last": { "$state": "/form/lastName" }
    }
  }
}
```

Functions are registered in the catalog and provided at runtime via the `functions` prop on the renderer.

```typescript
import type { ComputedFunction } from "@json-render/core";

const functions: Record<string, ComputedFunction> = {
  fullName: (args) => `${args.first} ${args.last}`,
};
```

### API

```typescript
import { resolvePropValue, resolveElementProps } from "@json-render/core";

// Resolve a single value
const color = resolvePropValue(
  { $cond: { $state: "/active", eq: "yes" }, $then: "blue", $else: "gray" },
  { stateModel: myState }
);

// Resolve all props on an element
const resolved = resolveElementProps(element.props, { stateModel: myState });
```

## Visibility Conditions

Visibility conditions control when elements are shown. `VisibilityContext` is `{ stateModel: StateModel, repeatItem?: unknown, repeatIndex?: number }`.

### Syntax

```typescript
{ "$state": "/path" }                          // truthiness
{ "$state": "/path", "not": true }             // falsy
{ "$state": "/path", "eq": value }             // equality
{ "$state": "/path", "neq": value }            // inequality
{ "$state": "/path", "gt": number }            // greater than
{ "$item": "field" }                          // repeat item field
{ "$index": true, "gt": 0 }                   // repeat index
[ condition, condition ]                       // implicit AND
{ "$and": [ condition, condition ] }           // explicit AND
{ "$or": [ condition, condition ] }            // OR
true / false                                   // always / never
```

### TypeScript Helpers

```typescript
import { visibility } from "@json-render/core";

visibility.always              // true
visibility.never               // false
visibility.when("/path")       // { $state: "/path" }
visibility.unless("/path")     // { $state: "/path", not: true }
visibility.eq("/path", val)    // { $state: "/path", eq: val }
visibility.neq("/path", val)   // { $state: "/path", neq: val }
visibility.gt("/path", n)      // { $state: "/path", gt: n }
visibility.gte("/path", n)     // { $state: "/path", gte: n }
visibility.lt("/path", n)      // { $state: "/path", lt: n }
visibility.lte("/path", n)     // { $state: "/path", lte: n }
visibility.and(cond1, cond2)   // { $and: [cond1, cond2] }
visibility.or(cond1, cond2)    // { $or: [cond1, cond2] }
```

## User Prompt Builder

Build structured user prompts for AI generation, with support for refinement and state context:

```typescript
import { buildUserPrompt } from "@json-render/core";

// Fresh generation
const prompt = buildUserPrompt({ prompt: "create a todo app" });

// Refinement with existing spec (triggers patch-only mode)
const refinementPrompt = buildUserPrompt({
  prompt: "add a dark mode toggle",
  currentSpec: existingSpec,
});

// With runtime state context
const contextPrompt = buildUserPrompt({
  prompt: "show my data",
  state: { todos: [{ text: "Buy milk" }] },
});
```

## Spec Validation

Validate spec structure and auto-fix common issues:

```typescript
import { validateSpec, autoFixSpec, formatSpecIssues } from "@json-render/core";

// Validate a spec
const { valid, issues } = validateSpec(spec);

// Format issues for display
console.log(formatSpecIssues(issues));

// Auto-fix common issues (returns a corrected copy)
const fixed = autoFixSpec(spec);
```

## State Watchers

Elements can declare a `watch` field to trigger actions when state values change. `watch` is a top-level field on the element (sibling of `type`, `props`, `children`), not inside `props`.

```json
{
  "type": "Select",
  "props": {
    "label": "Country",
    "value": { "$bindState": "/form/country" },
    "options": ["US", "Canada", "UK"]
  },
  "watch": {
    "/form/country": {
      "action": "loadCities",
      "params": { "country": { "$state": "/form/country" } }
    }
  },
  "children": []
}
```

Watchers only fire on value changes, not on initial render. Multiple action bindings per path execute sequentially.

## Validation

### Built-in Validation Functions

| Function | Description | Args |
|----------|-------------|------|
| `required` | Value must not be empty | — |
| `email` | Must be a valid email | — |
| `url` | Must be a valid URL | — |
| `numeric` | Must be a number | — |
| `minLength` | Minimum string length | `{ min: number }` |
| `maxLength` | Maximum string length | `{ max: number }` |
| `min` | Minimum numeric value | `{ min: number }` |
| `max` | Maximum numeric value | `{ max: number }` |
| `pattern` | Must match regex | `{ pattern: string }` |
| `matches` | Must equal another field | `{ other: { $state: "/path" } }` |
| `equalTo` | Alias for matches | `{ other: { $state: "/path" } }` |
| `lessThan` | Must be less than another field | `{ other: { $state: "/path" } }` |
| `greaterThan` | Must be greater than another field | `{ other: { $state: "/path" } }` |
| `requiredIf` | Required when condition is truthy | `{ field: { $state: "/path" } }` |

### TypeScript Helpers

```typescript
import { check } from "@json-render/core";

check.required("Field is required");
check.email("Invalid email");
check.matches("/form/password", "Passwords must match");
check.equalTo("/form/password", "Passwords must match");
check.lessThan("/form/endDate", "Must be before end date");
check.greaterThan("/form/startDate", "Must be after start date");
check.requiredIf("/form/enableNotifications", "Required when notifications enabled");
```

## Custom Schemas

json-render supports completely different spec formats for different renderers:

```typescript
// React: Flat element map
{ root: "card-1", elements: { "card-1": { type: "Card", props: {...}, children: [...] } } }

// Remotion: Timeline
{ composition: {...}, tracks: [...], clips: [...] }

// Your own: Whatever you need
{ pages: [...], navigation: {...}, theme: {...} }
```

Each renderer defines its own schema with `defineSchema()` and its own prompt template.
