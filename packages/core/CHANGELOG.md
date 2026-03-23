# @json-render/core

## 0.15.0

### Minor Changes

- bf3a7ec: Add Ink terminal renderer for interactive terminal UIs.

  ### New:
  - **`@json-render/ink`** -- Terminal UI renderer for json-render, built on Ink. Includes 20+ standard components (Box, Text, Heading, Card, Table, TextInput, Select, MultiSelect, Tabs, etc.), action/validation/focus contexts, two-way state binding, and streaming via `useUIStream`. Server-safe entry points at `@json-render/ink/schema`, `@json-render/ink/catalog`, and `@json-render/ink/server`.

  ### Improved:
  - **Examples** -- new `ink-chat` terminal chat demo, `game-engine` 3D example using react-three-fiber, website examples page with live demos and search.

## 0.14.1

### Patch Changes

- 43b7515: Add yaml format support to `buildUserPrompt`

  ### New:
  - `buildUserPrompt` now accepts `format` and `serializer` options, enabling YAML as a wire format alongside JSON

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

## 0.13.0

### Minor Changes

- 5b32de8: Add SolidJS and React Three Fiber renderers, plus strict JSON Schema mode for LLM structured outputs.

  ### New:
  - **`@json-render/solid`** -- SolidJS renderer. JSON becomes Solid components with reactive rendering, schema export, and full catalog support.
  - **`@json-render/react-three-fiber`** -- React Three Fiber renderer. JSON becomes 3D scenes with 19 built-in components for meshes, lights, models, environments, text, cameras, and controls.

  ### Improved:
  - **`@json-render/core`** -- `jsonSchema({ strict: true })` produces a JSON Schema subset compatible with LLM structured output APIs (OpenAI, Google Gemini, Anthropic). Ensures `additionalProperties: false` on every object and all properties listed in `required`.

## 0.12.1

### Patch Changes

- 54a1ecf: Rename generation modes and fix MCP React duplicate module error.

  ### Changed:
  - **`@json-render/core`** — Renamed generation modes from `"generate"` / `"chat"` to `"standalone"` / `"inline"`. The old names still work but emit a deprecation warning.

  ### Fixed:
  - **`@json-render/mcp`** — Resolved React duplicate module error (`useRef` returning null) by adding `resolve.dedupe` Vite configuration. Added `./build-app-html` export entry point.

  ### Other:
  - Updated `homepage` URLs across all packages to point to `https://json-render.dev`.
  - Reorganized skills directory structure for cleaner naming.
  - Added skills documentation page to the web app.

## 0.12.0

### Minor Changes

- 63c339b: Add Svelte renderer, React Email renderer, and MCP Apps integration.

  ### New:
  - **`@json-render/svelte`** — Svelte 5 renderer with runes-based reactivity. Full support for data binding, visibility, actions, validation, watchers, streaming, and repeat scopes. Includes `defineRegistry`, `Renderer`, `schema`, composables, and context providers.
  - **`@json-render/react-email`** — React Email renderer for generating HTML and plain-text emails from JSON specs. 17 standard components (Html, Head, Body, Container, Section, Row, Column, Heading, Text, Link, Button, Image, Hr, Preview, Markdown). Server-side `renderToHtml` / `renderToPlainText` APIs. Custom catalog and registry support.
  - **`@json-render/mcp`** — MCP Apps integration that serves json-render UIs as interactive apps inside Claude, ChatGPT, Cursor, VS Code, and other MCP-capable clients. `createMcpApp` server factory, `useJsonRenderApp` React hook for iframes, and `buildAppHtml` utility.

  ### Fixed:
  - **`@json-render/svelte`** — Corrected JSDoc comment and added missing `zod` peer dependency.

## 0.11.0

### Minor Changes

- 3f1e71e: Image renderer: generate SVG and PNG from JSON specs.

  ### New: `@json-render/image` Package

  Server-side image renderer powered by Satori. Turns the same `{ root, elements }` spec format into SVG or PNG output for OG images, social cards, and banners.
  - `renderToSvg(spec, options)` — render spec to SVG string
  - `renderToPng(spec, options)` — render spec to PNG buffer (requires `@resvg/resvg-js`)
  - 9 standard components: Frame, Box, Row, Column, Heading, Text, Image, Divider, Spacer
  - `standardComponentDefinitions` catalog for AI prompt generation
  - Server-safe import path: `@json-render/image/server`
  - Sub-path exports: `/render`, `/catalog`, `/server`

## 0.10.0

### Minor Changes

- 9cef4e9: Dynamic forms, Vue renderer, XState Store adapter, and computed values.

  ### New: `@json-render/vue` Package

  Vue 3 renderer for json-render. Full feature parity with `@json-render/react` including data binding, visibility conditions, actions, validation, repeat scopes, and streaming.
  - `defineRegistry` — create type-safe component registries from catalogs
  - `Renderer` — render specs as Vue component trees
  - Providers: `StateProvider`, `ActionProvider`, `VisibilityProvider`, `ValidationProvider`
  - Composables: `useStateStore`, `useStateValue`, `useStateBinding`, `useActions`, `useAction`, `useIsVisible`, `useFieldValidation`
  - Streaming: `useUIStream`, `useChatUI`
  - External store support via `StateStore` interface

  ### New: `@json-render/xstate` Package

  XState Store (atom) adapter for json-render's `StateStore` interface. Wire an `@xstate/store` atom as the state backend.
  - `xstateStoreStateStore({ atom })` — creates a `StateStore` from an `@xstate/store` atom
  - Requires `@xstate/store` v3+

  ### New: `$computed` Expressions

  Call registered functions from prop expressions:
  - `{ "$computed": "functionName", "args": { "key": <expression> } }` — calls a named function with resolved args
  - Functions registered via catalog and provided at runtime through `functions` prop on `JSONUIProvider` / `createRenderer`
  - `ComputedFunction` type exported from `@json-render/core`

  ### New: `$template` Expressions

  Interpolate state values into strings:
  - `{ "$template": "Hello, ${/user/name}!" }` — replaces `${/path}` references with state values
  - Missing paths resolve to empty string

  ### New: State Watchers

  React to state changes by triggering actions:
  - `watch` field on elements maps state paths to action bindings
  - Fires when watched values change (not on initial render)
  - Supports cascading dependencies (e.g. country → city loading)
  - `watch` is a top-level field on elements (sibling of type/props/children), not inside props
  - Spec validator detects and auto-fixes `watch` placed inside props

  ### New: Cross-Field Validation Functions

  New built-in validation functions for cross-field comparisons:
  - `equalTo` — alias for `matches` with clearer semantics
  - `lessThan` — value must be less than another field (numbers, strings, coerced)
  - `greaterThan` — value must be greater than another field
  - `requiredIf` — required only when a condition field is truthy
  - Validation args now resolve through `resolvePropValue` for consistent `$state` expression handling

  ### New: `validateForm` Action (React)

  Built-in action that validates all registered form fields at once:
  - Runs `validateAll()` synchronously and writes `{ valid, errors }` to state
  - Default state path: `/formValidation` (configurable via `statePath` param)
  - Added to React schema's built-in actions list

  ### Improved: shadcn/ui Validation

  All form components now support validation:
  - Checkbox, Radio, Switch — added `checks` and `validateOn` props
  - Input, Textarea, Select — added `validateOn` prop (controls timing: change/blur/submit)
  - Shared validation schemas reduce catalog definition duplication

  ### Improved: React Provider Tree

  Reordered provider nesting so `ValidationProvider` wraps `ActionProvider`, enabling `validateForm` to access validation state. Added `useOptionalValidation` hook for non-throwing access.

## 0.9.1

## 0.9.0

### Minor Changes

- 1d755c1: External state store, store adapters, and bug fixes.

  ### New: External State Store

  The `StateStore` interface lets you plug in your own state management (Redux, Zustand, Jotai, XState, etc.) instead of the built-in internal store. Pass a `store` prop to `StateProvider`, `JSONUIProvider`, or `createRenderer` for controlled mode.
  - Added `StateStore` interface and `createStateStore()` factory to `@json-render/core`
  - `StateProvider`, `JSONUIProvider`, and `createRenderer` now accept an optional `store` prop for controlled mode
  - When `store` is provided, it becomes the single source of truth (`initialState`/`onStateChange` are ignored)
  - When `store` is omitted, everything works exactly as before (fully backward compatible)
  - Applied across all platform packages: react, react-native, react-pdf
  - Store utilities (`createStoreAdapter`, `immutableSetByPath`, `flattenToPointers`) available via `@json-render/core/store-utils` for building custom adapters

  ### New: Store Adapter Packages
  - `@json-render/zustand` — Zustand adapter for `StateStore`
  - `@json-render/redux` — Redux / Redux Toolkit adapter for `StateStore`
  - `@json-render/jotai` — Jotai adapter for `StateStore`

  ### Changed: `onStateChange` signature updated (breaking)

  The `onStateChange` callback now receives a single array of changed entries instead of being called once per path:

  ```ts
  // Before
  onStateChange?: (path: string, value: unknown) => void

  // After
  onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void
  ```

  ### Fixed
  - Fix schema import to use server-safe `@json-render/react/schema` subpath, avoiding `createContext` crashes in Next.js App Router API routes
  - Fix chaining actions in `@json-render/react`, `@json-render/react-native`, and `@json-render/react-pdf`
  - Fix safely resolving inner type for Zod arrays in core schema

## 0.8.0

### Minor Changes

- 09376db: New `@json-render/react-pdf` package for generating PDF documents from JSON specs.

  ### New: `@json-render/react-pdf`

  PDF renderer for json-render, powered by `@react-pdf/renderer`. Define catalogs and registries the same way as `@json-render/react`, but output PDF documents instead of web UI.
  - `renderToBuffer(spec)` — render a spec to an in-memory PDF buffer
  - `renderToStream(spec)` — render to a readable stream (pipe to HTTP response)
  - `renderToFile(spec, path)` — render directly to a file on disk
  - `defineRegistry` / `createRenderer` — same API as `@json-render/react` for custom components
  - `standardComponentDefinitions` — Zod-based catalog definitions (server-safe via `@json-render/react-pdf/catalog`)
  - `standardComponents` — React PDF implementations for all standard components
  - Server-safe import via `@json-render/react-pdf/server`

  Standard components:
  - **Document structure**: Document, Page
  - **Layout**: View, Row, Column
  - **Content**: Heading, Text, Image, Link
  - **Data**: Table, List
  - **Decorative**: Divider, Spacer
  - **Page-level**: PageNumber

  Includes full context support: state management, visibility conditions, actions, validation, and repeat scopes — matching the capabilities of `@json-render/react`.

## 0.7.0

### Minor Changes

- 2d70fab: New `@json-render/shadcn` package, event handles, built-in actions, and stream improvements.

  ### New: `@json-render/shadcn` Package

  Pre-built [shadcn/ui](https://ui.shadcn.com/) component library for json-render. 30+ components built on Radix UI + Tailwind CSS, ready to use with `defineCatalog` and `defineRegistry`.
  - `shadcnComponentDefinitions` — Zod-based catalog definitions for all components (server-safe, no React dependency via `@json-render/shadcn/catalog`)
  - `shadcnComponents` — React implementations for all components
  - Layout: Card, Stack, Grid, Separator
  - Navigation: Tabs, Accordion, Collapsible, Pagination
  - Overlay: Dialog, Drawer, Tooltip, Popover, DropdownMenu
  - Content: Heading, Text, Image, Avatar, Badge, Alert, Carousel, Table
  - Feedback: Progress, Skeleton, Spinner
  - Input: Button, Link, Input, Textarea, Select, Checkbox, Radio, Switch, Slider, Toggle, ToggleGroup, ButtonGroup

  ### New: Event Handles (`on()`)

  Components now receive an `on(event)` function in addition to `emit(event)`. The `on()` function returns an `EventHandle` with metadata:
  - `emit()` — fire the event
  - `shouldPreventDefault` — whether any action binding requested `preventDefault`
  - `bound` — whether any handler is bound to this event

  ### New: `BaseComponentProps`

  Catalog-agnostic base type for component render functions. Use when building reusable component libraries (like `@json-render/shadcn`) that are not tied to a specific catalog.

  ### New: Built-in Actions in Schema

  Schemas can now declare `builtInActions` — actions that are always available at runtime and automatically injected into prompts. The React schema declares `setState`, `pushState`, and `removeState` as built-in, so they appear in prompts without needing to be listed in catalog `actions`.

  ### New: `preventDefault` on `ActionBinding`

  Action bindings now support a `preventDefault` boolean field, allowing the LLM to request that default browser behavior (e.g. navigation on links) be prevented.

  ### Improved: Stream Transform Text Block Splitting

  `createJsonRenderTransform()` now properly splits text blocks around spec data by emitting `text-end`/`text-start` pairs. This ensures the AI SDK creates separate text parts, preserving correct interleaving of prose and UI in `message.parts`.

  ### Improved: `defineRegistry` Actions Requirement

  `defineRegistry` now conditionally requires the `actions` field only when the catalog declares actions. Catalogs with no actions (e.g. `actions: {}`) no longer need to pass an empty actions object.

## 0.6.1

## 0.6.1

### Patch Changes

- ea97aff: Fix infinite re-render loop caused by multiple unbound form inputs (Input, Textarea, Select) all registering field validation at the same empty path with different `checks` configs, causing them to overwrite each other endlessly. Stabilize context values in ActionProvider, ValidationProvider, and useUIStream by using refs for state/callbacks, preventing unnecessary re-render cascades on every state update.

## 0.6.0

### Minor Changes

- 06b8745: Chat mode (inline GenUI), AI SDK integration, two-way binding, and expression-based visibility/props.

  ### New: Chat Mode (Inline GenUI)

  Two generation modes: **Generate** (JSONL-only, the default) and **Chat** (text + JSONL inline). Chat mode lets AI respond conversationally with embedded UI specs — ideal for chatbots and copilot experiences.
  - `catalog.prompt({ mode: "chat" })` generates a chat-aware system prompt
  - `pipeJsonRender()` server-side transform separates text from JSONL patches in a mixed stream
  - `createJsonRenderTransform()` low-level TransformStream for custom pipelines

  ### New: AI SDK Integration

  First-class Vercel AI SDK support with typed data parts and stream utilities.
  - `SpecDataPart` type for `data-spec` stream parts (patch, flat, nested payloads)
  - `SPEC_DATA_PART` / `SPEC_DATA_PART_TYPE` constants for type-safe part filtering
  - `createMixedStreamParser()` for parsing mixed text + JSONL streams

  ### New: React Chat Hooks
  - `useChatUI()` — full chat hook with message history, streaming, and spec extraction
  - `useJsonRenderMessage()` — extract spec + text from a message's parts array
  - `buildSpecFromParts()` / `getTextFromParts()` — utilities for working with AI SDK message parts
  - `useBoundProp()` — two-way binding hook for `$bindState` / `$bindItem` expressions

  ### New: Two-Way Binding

  Props can now use `$bindState` and `$bindItem` expressions for two-way data binding. The renderer resolves bindings and passes a `bindings` map to components, enabling write-back to state.

  ### New: Expression-Based Props and Visibility

  Replaced string token rewriting with structured expression objects:
  - Props: `{ $state: "/path" }`, `{ $item: "field" }`, `{ $index: true }`
  - Visibility: `{ $state: "/path", eq: "value" }`, `{ $item: "active" }`, `{ $index: true, gt: 0 }`
  - Logic: `{ $and: [...] }`, `{ $or: [...] }`, and implicit AND via arrays
  - Comparison operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `not`

  ### New: Utilities
  - `applySpecPatch()` — typed convenience wrapper for applying a single patch to a Spec
  - `nestedToFlat()` — convert nested tree specs to flat `{ root, elements }` format
  - `resolveBindings()` / `resolveActionParam()` — resolve binding paths and action params

  ### New: Chat Example

  Full-featured chat example (`examples/chat`) with AI agent, tool calls (crypto, GitHub, Hacker News, weather, search), theme toggle, and streaming UI generation.

  ### Improved: Renderer
  - `ElementRenderer` is now `React.memo`'d for better performance in repeat lists
  - `emit` is always defined (never `undefined`) — no more optional chaining needed
  - Action params are resolved through `resolveActionParam` supporting `$item`, `$index`, `$state`
  - Repeat scope now passes the actual item object instead of requiring token rewriting

  ### Breaking Changes
  - **Expressions renamed**: `{ $path }` / `{ path }` replaced by `{ $state }`, `{ $item }`, `{ $index }`
  - **Visibility conditions**: `{ path }` → `{ $state }`, `{ and/or/not }` → `{ $and/$or }` with `not` as operator flag
  - **DynamicValue**: `{ path: string }` → `{ $state: string }`
  - **Repeat field**: `repeat.path` → `repeat.statePath`
  - **Action params**: `path` → `statePath` in setState action params
  - **Provider props**: `actionHandlers` → `handlers` on `JSONUIProvider`/`ActionProvider`
  - **Auth removed**: `AuthState` type and `{ auth }` visibility conditions removed — model auth as regular state
  - **Legacy catalog removed**: `createCatalog`, `generateCatalogPrompt`, `generateSystemPrompt`, `ComponentDefinition`, `CatalogConfig`, `SystemPromptOptions` removed
  - **React exports removed**: `createRendererFromCatalog`, `rewriteRepeatTokens`
  - **Codegen**: `traverseTree` → `traverseSpec`, `SpecVisitor` → `TreeVisitor`

## 0.5.2

### Patch Changes

- 429e456: Fix LLM hallucinations by dynamically generating prompt examples from the user's catalog instead of hardcoding component names. Adds optional `example` field to `ComponentDefinition` with Zod schema introspection fallback. Mentions RFC 6902 in output format section.

## 0.5.1

## 0.5.0

### Minor Changes

- 3d2d1ad: Add @json-render/react-native package, event system (emit replaces onAction), repeat/list rendering, user prompt builder, spec validation, and rename DataProvider to StateProvider.

## 0.4.4

### Patch Changes

- dd17549: remove key/parentKey from flat specs, RFC 6902 compliance for SpecStream

## 0.4.3

### Patch Changes

- 61ee8e5: include remove op in system prompt

## 0.4.2

### Patch Changes

- 54bce09: add defineRegistry function
