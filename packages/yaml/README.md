# @json-render/yaml

YAML wire format for `@json-render/core`. Progressive rendering and surgical edits via streaming YAML.

## Installation

```bash
npm install @json-render/yaml @json-render/core yaml
```

## Key Concepts

- **YAML wire format**: Uses `yaml-spec`, `yaml-edit`, `yaml-patch`, and `diff` code fences instead of JSONL
- **Streaming parser**: Incrementally parses YAML as it arrives, emitting JSON Patch operations
- **Edit modes**: Supports patch (RFC 6902), merge (RFC 7396), and unified diff for surgical edits
- **AI SDK transform**: Drop-in `TransformStream` that converts YAML fences into json-render patch data parts

## Quick Start

### Generate a YAML System Prompt

```typescript
import { yamlPrompt } from "@json-render/yaml";
import { catalog } from "./catalog";

const systemPrompt = yamlPrompt(catalog, {
  mode: "standalone",
  editModes: ["merge"],
});
```

### Stream YAML Specs (AI SDK)

```typescript
import { pipeYamlRender } from "@json-render/yaml";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

const stream = createUIMessageStream({
  execute: async ({ writer }) => {
    writer.merge(pipeYamlRender(result.toUIMessageStream()));
  },
});
return createUIMessageStreamResponse({ stream });
```

### Streaming Parser (Low-Level)

```typescript
import { createYamlStreamCompiler } from "@json-render/yaml";

const compiler = createYamlStreamCompiler<Spec>();

// Feed chunks as they arrive
const { result, newPatches } = compiler.push("root: main\n");
compiler.push("elements:\n  main:\n    type: Card\n");

// Flush remaining data
const { result: final } = compiler.flush();
```

## API Reference

### `yamlPrompt(catalog, options?)`

Generate a YAML-format system prompt from any json-render catalog.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `system` | `string` | `"You are a UI generator that outputs YAML."` | Custom system message intro |
| `mode` | `"standalone" \| "inline"` | `"standalone"` | Output mode |
| `customRules` | `string[]` | `[]` | Additional rules |
| `editModes` | `EditMode[]` | `["merge"]` | Edit modes to document |

### `createYamlTransform(options?)`

Creates a `TransformStream` that converts YAML spec/edit fences in AI SDK stream chunks into json-render patch data parts.

| Option | Type | Description |
|--------|------|-------------|
| `previousSpec` | `Spec` | Seed with a previous spec for multi-turn edit support |

### `pipeYamlRender(stream, options?)`

Convenience wrapper that pipes an AI SDK stream through the YAML transform. Drop-in replacement for `pipeJsonRender` from `@json-render/core`.

### `createYamlStreamCompiler(initial?)`

Create a streaming YAML compiler that incrementally parses YAML text and emits JSON Patch operations.

**Returns** `YamlStreamCompiler<T>` with methods:

| Method | Description |
|--------|-------------|
| `push(chunk)` | Push a chunk of text. Returns `{ result, newPatches }` |
| `flush()` | Flush remaining buffer and return final result |
| `getResult()` | Get the current compiled result |
| `getPatches()` | Get all patches applied so far |
| `reset(initial?)` | Reset to initial state |

### Fence Constants

Exported constants for fence detection:

- `YAML_SPEC_FENCE` — `` ```yaml-spec ``
- `YAML_EDIT_FENCE` — `` ```yaml-edit ``
- `YAML_PATCH_FENCE` — `` ```yaml-patch ``
- `DIFF_FENCE` — `` ```diff ``
- `FENCE_CLOSE` — `` ``` ``

### Re-exports from `@json-render/core`

- `diffToPatches(oldObj, newObj)` — Generate RFC 6902 JSON Patch from object diff
- `deepMergeSpec(base, patch)` — RFC 7396 JSON Merge Patch
