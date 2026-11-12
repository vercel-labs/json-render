# @json-render/codegen

Utilities for generating code from json-render UI trees.

This package provides framework-agnostic utilities for building code generators. Use these utilities to create custom code exporters for your specific framework (Next.js, Remix, etc.).

## Installation

```bash
npm install @json-render/codegen
# or
pnpm add @json-render/codegen
```

## Utilities

### Tree Traversal

```typescript
import { traverseSpec, collectUsedComponents, collectStatePaths, collectActions } from '@json-render/codegen';

// Walk the spec depth-first
traverseSpec(spec, (element, key, depth, parent) => {
  console.log(`${' '.repeat(depth * 2)}${key}: ${element.type}`);
});

// Get all component types used
const components = collectUsedComponents(spec);
// Set { 'Card', 'Metric', 'Button' }

// Get all state paths referenced
const statePaths = collectStatePaths(spec);
// Set { 'analytics/revenue', 'user/name' }

// Get all action names
const actions = collectActions(spec);
// Set { 'submit_form', 'refresh_data' }
```

### Serialization

```typescript
import { serializePropValue, serializeProps, escapeString } from '@json-render/codegen';

// Serialize a single value
serializePropValue("hello");
// { value: '"hello"', needsBraces: true }

serializePropValue(42);
// { value: '42', needsBraces: true }

serializePropValue({ $state: '/user/name' });
// { value: '{ $state: "/user/name" }', needsBraces: true }

// Serialize props for JSX
serializeProps({ title: "Dashboard", columns: 3, disabled: true });
// 'title={"Dashboard"} columns={3} disabled'
```

### Types

```typescript
import type { GeneratedFile, CodeGenerator } from '@json-render/codegen';

// Implement your own code generator
const myGenerator: CodeGenerator = {
  generate(spec) {
    return [
      { path: 'package.json', content: '...' },
      { path: 'app/page.tsx', content: '...' },
    ];
  }
};
```

## Building a Custom Generator

See the `examples/dashboard` for a complete example of building a Next.js code generator using these utilities.

```typescript
import { 
  collectUsedComponents, 
  collectStatePaths,
  traverseSpec,
  serializeProps,
  type GeneratedFile 
} from '@json-render/codegen';
import type { Spec } from '@json-render/core';

export function generateNextJSProject(spec: Spec): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const components = collectUsedComponents(spec);
  
  // Generate package.json
  files.push({
    path: 'package.json',
    content: JSON.stringify({
      name: 'my-generated-app',
      dependencies: {
        next: '^14.0.0',
        react: '^18.0.0',
      }
    }, null, 2)
  });
  
  // Generate component files...
  // Generate main page...
  
  return files;
}
```

## License

Apache-2.0
