---
name: yaml
description: YAML wire format for json-render with streaming parser, prompt generation, and AI SDK transform. Use when working with @json-render/yaml, YAML-based spec streaming, yaml-spec/yaml-edit fences, or YAML prompt generation.
---

# @json-render/yaml

YAML wire format for `@json-render/core`. Progressive rendering and surgical edits via streaming YAML.

## Key Concepts

- **YAML wire format**: Alternative to JSONL that uses code fences (`yaml-spec`, `yaml-edit`, `yaml-patch`, `diff`)
- **Streaming parser**: Incrementally parses YAML, emits JSON Patch operations via diffing
- **Edit modes**: Patch (RFC 6902), merge (RFC 7396), and unified diff
- **AI SDK transform**: `TransformStream` that converts YAML fences into json-render patches

## Generating YAML Prompts

```typescript
import { yamlPrompt } from "@json-render/yaml";
import { catalog } from "./catalog";

// Standalone mode (LLM outputs only YAML)
const systemPrompt = yamlPrompt(catalog, {
  mode: "standalone",
  editModes: ["merge"],
  customRules: ["Always use dark theme"],
});

// Inline mode (LLM responds conversationally, wraps YAML in fences)
const chatPrompt = yamlPrompt(catalog, { mode: "inline" });
```

Options:

- `system` (string) — Custom system message intro
- `mode` ("standalone" | "inline") — Output mode, default "standalone"
- `customRules` (string[]) — Additional rules appended to prompt
- `editModes` (EditMode[]) — Edit modes to document, default ["merge"]

## AI SDK Transform

Use `pipeYamlRender` as a drop-in replacement for `pipeJsonRender`:

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

For multi-turn edits, pass the previous spec:

```typescript
pipeYamlRender(result.toUIMessageStream(), {
  previousSpec: currentSpec,
});
```

The transform recognizes four fence types:

- `yaml-spec` — Full spec, parsed progressively line-by-line
- `yaml-edit` — Partial YAML deep-merged with current spec (RFC 7396)
- `yaml-patch` — RFC 6902 JSON Patch lines
- `diff` — Unified diff applied to serialized spec

## Streaming Parser (Low-Level)

```typescript
import { createYamlStreamCompiler } from "@json-render/yaml";

const compiler = createYamlStreamCompiler<Spec>();

// Feed chunks as they arrive from any source
const { result, newPatches } = compiler.push("root: main\n");
compiler.push("elements:\n  main:\n    type: Card\n");

// Flush remaining data at end of stream
const { result: final } = compiler.flush();

// Reset for next stream (optionally with initial state)
compiler.reset({ root: "main", elements: {} });
```

Methods: `push(chunk)`, `flush()`, `getResult()`, `getPatches()`, `reset(initial?)`

## Edit Modes (from @json-render/core)

The YAML package uses the universal edit mode system from core:

```typescript
import { buildEditInstructions, buildEditUserPrompt } from "@json-render/core";
import type { EditMode } from "@json-render/core";

// Generate edit instructions for YAML format
const instructions = buildEditInstructions({ modes: ["merge", "patch"] }, "yaml");

// Build user prompt with current spec context
const userPrompt = buildEditUserPrompt({
  prompt: "Change the title to Dashboard",
  currentSpec: spec,
  config: { modes: ["merge"] },
  format: "yaml",
  serializer: (s) => yamlStringify(s, { indent: 2 }).trimEnd(),
});
```

## Fence Constants

For custom parsing, use the exported constants:

```typescript
import {
  YAML_SPEC_FENCE,   // "```yaml-spec"
  YAML_EDIT_FENCE,   // "```yaml-edit"
  YAML_PATCH_FENCE,  // "```yaml-patch"
  DIFF_FENCE,        // "```diff"
  FENCE_CLOSE,       // "```"
} from "@json-render/yaml";
```

## Key Exports

| Export | Description |
|--------|-------------|
| `yamlPrompt` | Generate YAML system prompt from catalog |
| `createYamlTransform` | AI SDK TransformStream for YAML fences |
| `pipeYamlRender` | Convenience pipe wrapper (replaces `pipeJsonRender`) |
| `createYamlStreamCompiler` | Streaming YAML parser with patch emission |
| `YAML_SPEC_FENCE` | Fence constant for yaml-spec |
| `YAML_EDIT_FENCE` | Fence constant for yaml-edit |
| `YAML_PATCH_FENCE` | Fence constant for yaml-patch |
| `DIFF_FENCE` | Fence constant for diff |
| `FENCE_CLOSE` | Fence close constant |
| `diffToPatches` | Re-export: object diff to JSON Patch |
| `deepMergeSpec` | Re-export: RFC 7396 deep merge |
