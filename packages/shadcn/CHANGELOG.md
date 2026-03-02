# @json-render/shadcn

## 0.11.0

### Patch Changes

- Updated dependencies [3f1e71e]
  - @json-render/core@0.11.0
  - @json-render/react@0.11.0

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

### Patch Changes

- Updated dependencies [9cef4e9]
  - @json-render/core@0.10.0
  - @json-render/react@0.10.0

## 0.9.1

### Patch Changes

- Updated dependencies [b103676]
  - @json-render/react@0.9.1
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
  - @json-render/react@0.9.0

## 0.8.0

### Patch Changes

- Updated dependencies [09376db]
  - @json-render/core@0.8.0
  - @json-render/react@0.8.0

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

### Patch Changes

- Updated dependencies [2d70fab]
  - @json-render/core@0.7.0
  - @json-render/react@0.7.0
