# @json-render/yaml

## 0.15.0

### Patch Changes

- Updated dependencies [bf3a7ec]
  - @json-render/core@0.15.0

## 0.14.1

### Patch Changes

- Updated dependencies [43b7515]
  - @json-render/core@0.14.1

## 0.14.0

### Minor Changes

- a8afd8b: Add YAML wire format package and universal edit modes for surgical spec refinement.

  ### New:
  - **`@json-render/yaml`** -- YAML wire format for json-render. Includes streaming YAML parser, `yamlPrompt()` for system prompts, and AI SDK transform (`pipeYamlRender`) as a drop-in alternative to JSONL streaming. Supports four fence types: `yaml-spec`, `yaml-edit`, `yaml-patch`, and `diff`.
  - **Universal edit modes** in `@json-render/core` -- three strategies for multi-turn spec refinement: `patch` (RFC 6902), `merge` (RFC 7396), and `diff` (unified diff). New `editModes` option on `buildUserPrompt()` and `PromptOptions`. New helpers: `deepMergeSpec()`, `diffToPatches()`, `buildEditUserPrompt()`, `buildEditInstructions()`, `isNonEmptySpec()`.

  ### Improved:
  - **Playground** -- format toggle (JSONL / YAML), edit mode picker (patch / merge / diff), and token usage display with prompt caching stats.
  - **Prompt caching** -- generate API uses Anthropic ephemeral cache control for system prompts.
  - **CI** -- lint, type-check, and test jobs now run in parallel.

### Patch Changes

- Updated dependencies [a8afd8b]
  - @json-render/core@0.14.0
