# @json-render/codegen

## 0.11.0

### Patch Changes

- Updated dependencies [3f1e71e]
  - @json-render/core@0.11.0

## 0.10.0

### Patch Changes

- Updated dependencies [9cef4e9]
  - @json-render/core@0.10.0

## 0.9.1

### Patch Changes

- @json-render/core@0.9.1

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

### Patch Changes

- Updated dependencies [1d755c1]
  - @json-render/core@0.9.0

## 0.8.0

### Patch Changes

- Updated dependencies [09376db]
  - @json-render/core@0.8.0

## 0.7.0

### Patch Changes

- Updated dependencies [2d70fab]
  - @json-render/core@0.7.0

## 0.6.1

### Patch Changes

- @json-render/core@0.6.1

## 0.6.1

### Patch Changes

- Updated dependencies [ea97aff]
  - @json-render/core@0.6.1

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

### Patch Changes

- Updated dependencies [06b8745]
  - @json-render/core@0.6.0

## 0.5.2

### Patch Changes

- 429e456: Fix LLM hallucinations by dynamically generating prompt examples from the user's catalog instead of hardcoding component names. Adds optional `example` field to `ComponentDefinition` with Zod schema introspection fallback. Mentions RFC 6902 in output format section.
- Updated dependencies [429e456]
  - @json-render/core@0.5.2

## 0.5.1

### Patch Changes

- @json-render/core@0.5.1

## 0.5.0

### Minor Changes

- 3d2d1ad: Add @json-render/react-native package, event system (emit replaces onAction), repeat/list rendering, user prompt builder, spec validation, and rename DataProvider to StateProvider.

### Patch Changes

- Updated dependencies [3d2d1ad]
  - @json-render/core@0.5.0

## 0.4.4

### Patch Changes

- dd17549: remove key/parentKey from flat specs, RFC 6902 compliance for SpecStream
- Updated dependencies [dd17549]
  - @json-render/core@0.4.4

## 0.4.3

### Patch Changes

- 61ee8e5: include remove op in system prompt
- Updated dependencies [61ee8e5]
  - @json-render/core@0.4.3

## 0.4.2

### Patch Changes

- 54bce09: add defineRegistry function
- Updated dependencies [54bce09]
  - @json-render/core@0.4.2
