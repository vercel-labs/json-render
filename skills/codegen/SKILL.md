---
name: codegen
description: Code generation utilities for json-render. Use when generating code from UI specs, building custom code exporters, traversing specs, or serializing props for @json-render/codegen.
---

# @json-render/codegen

Framework-agnostic utilities for generating code from json-render UI trees. Use these to build custom code exporters for Next.js, Remix, or other frameworks.

## Installation

```bash
npm install @json-render/codegen
```

## Tree Traversal

```typescript
import {
  traverseSpec,
  collectUsedComponents,
  collectStatePaths,
  collectActions,
} from "@json-render/codegen";

// Walk the spec depth-first
traverseSpec(spec, (element, key, depth, parent) => {
  console.log(`${" ".repeat(depth * 2)}${key}: ${element.type}`);
});

// Get all component types used
const components = collectUsedComponents(spec);
// Set { "Card", "Metric", "Button" }

// Get all state paths referenced
const statePaths = collectStatePaths(spec);
// Set { "analytics/revenue", "user/name" }

// Get all action names
const actions = collectActions(spec);
// Set { "submit_form", "refresh_data" }
```

## Serialization

```typescript
import {
  serializePropValue,
  serializeProps,
  escapeString,
  type SerializeOptions,
} from "@json-render/codegen";

// Serialize a single value
serializePropValue("hello");
// { value: '"hello"', needsBraces: false }

serializePropValue({ $state: "/user/name" });
// { value: '{ $state: "/user/name" }', needsBraces: true }

// Serialize props for JSX
serializeProps({ title: "Dashboard", columns: 3, disabled: true });
// 'title="Dashboard" columns={3} disabled'

// Escape strings for code
escapeString('hello "world"');
// 'hello \"world\"'
```

### SerializeOptions

```typescript
interface SerializeOptions {
  quotes?: "single" | "double";
  indent?: number;
}
```

## Types

```typescript
import type { GeneratedFile, CodeGenerator } from "@json-render/codegen";

const myGenerator: CodeGenerator = {
  generate(spec) {
    return [
      { path: "package.json", content: "..." },
      { path: "app/page.tsx", content: "..." },
    ];
  },
};
```

## Building a Custom Generator

```typescript
import {
  collectUsedComponents,
  collectStatePaths,
  traverseSpec,
  serializeProps,
  type GeneratedFile,
} from "@json-render/codegen";
import type { Spec } from "@json-render/core";

export function generateNextJSProject(spec: Spec): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const components = collectUsedComponents(spec);
  // Generate package.json, component files, main page...
  return files;
}
```
