# @json-render/react-three-fiber

## 0.14.1

### Patch Changes

- Updated dependencies [43b7515]
  - @json-render/core@0.14.1
  - @json-render/react@0.14.1

## 0.14.0

### Patch Changes

- Updated dependencies [a8afd8b]
  - @json-render/core@0.14.0
  - @json-render/react@0.14.0

## 0.13.0

### Minor Changes

- 5b32de8: Add SolidJS and React Three Fiber renderers, plus strict JSON Schema mode for LLM structured outputs.

  ### New:
  - **`@json-render/solid`** -- SolidJS renderer. JSON becomes Solid components with reactive rendering, schema export, and full catalog support.
  - **`@json-render/react-three-fiber`** -- React Three Fiber renderer. JSON becomes 3D scenes with 19 built-in components for meshes, lights, models, environments, text, cameras, and controls.

  ### Improved:
  - **`@json-render/core`** -- `jsonSchema({ strict: true })` produces a JSON Schema subset compatible with LLM structured output APIs (OpenAI, Google Gemini, Anthropic). Ensures `additionalProperties: false` on every object and all properties listed in `required`.

### Patch Changes

- Updated dependencies [5b32de8]
  - @json-render/core@0.13.0
  - @json-render/react@0.13.0
